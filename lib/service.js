'use babel';

// TODO: in /lib/service.js
import Todo from './todo.js';
import {TextBuffer} from 'atom';

async function byDirectoriesThenFiles(a, b) {
  await a;
  await b;
  // ^ is a XOR operator (a^b = (a==b)? 0 : 1)
  if ( (a.nodes.length == 0 ^ b.nodes.length == 0) == 0 ) {
    return 0;
  } else if (a.nodes.length > 0) {
    return -1;
  } else {
    return 1;
  }
}

export default {
  count: 0,

  findTodoItems() {
    var flags, ignoredPaths, options, pattern, regex, results;
    results = [];

    function iterator(result) {
      let tmp = atom.project.relativizePath(result.filePath);
      if (tmp[0]) {
        result.relativePath = tmp[0].substring(tmp[0].lastIndexOf("/") + 1) + "/" + tmp[1];
      } else {
        result.relativePath = tmp[1];
      }
      return results.push(result);
    }

    // TODO: find multiline comments
    // like this one.

    /*
    * TODO: find comments like
    * these too
    */

    // TODO: update results as the documents change, debounce for performance
    pattern = atom.config.get('todo.a_pattern');
    flags = atom.config.get('todo.b_flags');
    regex = new RegExp(pattern, flags);
    ignoredPaths = atom.config.get('todo.c_ignorePaths').map(function(path) {
    	// return '!' + path;
        path = path.replace(/[/]/g, '[/]');
    	path = path.replace(/[.]/g, '\.');
    	path = path.replace(/[*]{2}[/]/g, '.*');
    	return path.replace(/[/][*]{2}/g, '.*');
    });

	if(atom.config.get("todo.d_ignoreCommonPaths")) {
		otherIgnoredPaths = Todo.commonPathToIgnore.map(function(path) {
			path = path.replace(/\\/g, '');
			// return '!' + path;
        	path = path.replace(/[/]/g, '[/]');
        	path = path.replace(/[.]/g, '[.]');
        	path = path.replace(/[*]{2}/g, '.*');
        	return path.replace(/[*]{2}/g, '.*');
		});

		ignoredPaths = [...ignoredPaths, ...otherIgnoredPaths];
	}

    let scope = atom.config.get("todo.e_todoScope");
    let tmpBuffers = [];
    let fileBuffers = [];
    let textEditorBuffers = [];
    let fileList = [];
    let textEditorList = [];

    // get the every file of the workspace
    if (scope == 'workspace') {
        fileList = fileList.concat(atom.project.getDirectories());
    }

    // get the projects of opened files
    if (scope == 'projects of opened files') {
        let paths = [];
        // for each opened files get the path of his project
        // and if it isn't saved then add it as TextEditor
        for (let textEditor of atom.workspace.getTextEditors()) {
            let path = atom.project.relativizePath(textEditor.getPath());
            if (path[0] == null) {
                textEditorList = textEditorList.concat(textEditor);
            } else if (paths.indexOf(path[0]) == -1) {
                paths = paths.concat(path[0]);
            }
        }

        // for each paths get the project
        for (let path of paths) {
            for (let project of atom.project.getDirectories()) {
                if (path == project.getRealPathSync()) {
                    fileList = fileList.concat(project);
                }
            }
        }
    }

    // get the first project
    if (scope == 'first project' || scope == 'first project + opened files') {
        fileList = fileList.concat( atom.project.getDirectories()[0].getEntriesSync() );
        fileList = atom.project.getDirectories()[0].getEntriesSync();
    }

    // get the first project
    if (scope == 'opened files' || scope == 'first project + opened files' || scope == 'workspace') {
        textEditorList = textEditorList.concat( atom.workspace.getTextEditors() );
    };

    // get the active file
    if (scope == 'active file') {
        textEditorList = textEditorList.concat( atom.workspace.getActiveTextEditor() );
    }

    // visit the subfolders until only files are left
    let alreadySeenPaths = [];
    while(
        fileList.some((elem) => { return elem.isDirectory(); })
    ) {
        fileList = fileList.map((elem) => {
            for (let ip of ignoredPaths) {
                if (elem.path.match(ip) != null) {
                    return [];
                };
            };
            // prevent file to be present multiple time
            // e.g. scope = workspace
            //      one project is subfolder of another
            if (elem.isDirectory() && alreadySeenPaths.indexOf(elem.path) != -1) {
                return [];
            }
            alreadySeenPaths = alreadySeenPaths.concat(elem.path);
            // get to the files
            return (elem.isDirectory())? elem.getEntriesSync() : elem;
        });
        // this line transform [a, [b, c]] to [a, b, c]
        fileList = fileList.reduce((acc, val) => acc.concat(val), []);
    }

    // add this function to the textEditor used to get the tree path
    for (let i = 0; i < textEditorList.length; i++) {
        textEditorList[i].getRealPathSync = function() {
            return (textEditorList[i] && textEditorList[i].getPath()) ? textEditorList[i].getPath() : "/untitled";
        };
    };

    // remove the entries present in both array
    let tmpFileList = fileList.map((file) => {
        let isInBoth = -1;
        for(let i = 0; i < textEditorList.length; i++) {
            let textEditor = textEditorList[i];
            if(file.getRealPathSync() == textEditor.getRealPathSync()) {isInBoth = file;};
        };
        if(isInBoth == -1) {
            return file;
        } else {
            return isInBoth;
        }
    });

    textEditorList = textEditorList.filter((textEditor) => {
        let isInBoth = false;
        for(let i = 0; i < fileList.length; i++) {
            let file = fileList[i];
            if(textEditor.getRealPathSync() == file.getRealPathSync()) {isInBoth = true;};
        };
        return !isInBoth;
    });

    fileList = tmpFileList;

    // get the buffer for each file
    tmpBuffers = fileList.map(async (elem) => {
        let text = await elem.read(true);
        return new TextBuffer(text);
    });
    fileBuffers = fileBuffers.concat(tmpBuffers);

    // get the buffer for each textEditor
    tmpBuffers = textEditorList.map(async (elem) => {
        let ret = await elem.getBuffer();
        return ret;
    })
    textEditorBuffers = textEditorBuffers.concat(tmpBuffers);

    return new Promise(resolve => {
        let alreadySearched = 0;
        fileBuffers.forEach(
            async function (element, index) {
                let elem = await element;
                await elem.scan(regex, (match) => {
                    let matchObject = {};
                    matchObject.filePath = fileList[index].getRealPathSync();
                    iterator(matchObject);
                    matchObject.matches = [match];
                })
                atom.emitter.emit('todo:pathSearched', ++alreadySearched);
            }
        )

        textEditorBuffers.forEach(
            async function (element, index) {
                let elem = await element;
                await elem.scan(regex, (match) => {
                    let matchObject = {};
                    matchObject.filePath = textEditorList[index].getRealPathSync();
                    iterator(matchObject);
                    matchObject.matches = [match];
                })
                atom.emitter.emit('todo:pathSearched', ++alreadySearched);
            }
        )
        resolve(results);
    });
  },

  getTreeFormat(results) {
    const tree = {
      path: '/',
      nodes: [],
    };

    results.map(result => {
      // figure out which node this goes in based off relativePath
      const {relativePath} = result;
      const parts = relativePath.split('/');
      let currentNode = tree;

      while (parts.length) {
        const part = parts.shift();

        let nextNode = currentNode.nodes.find(node => node.path === part);
        if (!nextNode) {
          nextNode = {
            path: part,
            text: part,
            icon: parts.length
              ? 'icon-file-directory'
              : 'icon-file-text',
            nodes: [],
          };

          currentNode.nodes.push(nextNode);
          currentNode.nodes = currentNode.nodes.sort(byDirectoriesThenFiles);
        }

        if (!parts.length) {
          // This is the end.  Add matches as nodes.
          nextNode.nodes = nextNode.nodes.concat(
            result.matches.map((match, i) => {
              return {
                path: i + '',
                text: match.matchText,
                nodes: [],
                data: {
                  filePath: result.filePath,
                  range: match.range,
                },
              };
            })
          );
        }

        currentNode = nextNode;
      }
    });

    return tree;
  },
};
