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

    // NOTE: this one is used to get only the first project
    let buffers
    let fileList = atom.project.getDirectories()[0].getEntriesSync();
    while(
        fileList.some((elem) => { return elem.isDirectory(); })
    ) {
        fileList = fileList.map((elem) => {
            for (let ip of ignoredPaths) {
                if (elem.path.match(ip) != null) {
                    return [];
                };
            };
            return (elem.isDirectory())? elem.getEntriesSync() : elem;
        });
        fileList = fileList.reduce((acc, val) => acc.concat(val), []);
    }

    buffers = fileList.map(async (elem) => {
        let text = await elem.read(true);
        return new TextBuffer(text);
    });
    // XXX: NOTE: end here

    // set path to everything if no path is ignored
    function getPaths() {
        if (ignoredPaths.length != 0) {
            return ignoredPaths;
        }
        return [];
    };

    // NOTE: this one is used to get only active file
    //
    // fileList = [atom.workspace.getActiveTextEditor()];
    // fileList[0].getRealPathSync = function() { return fileList[0].getPath() ? fileList[0].getPath() : "/untitled" }
    // buffers = fileList.map(async (elem) => {
    //     let ret = await elem.getBuffer();
    //     return ret;
    // })
    //
    // XXX: NOTE: end here

    // XXX: the multiple scan on the same file return different match
    // XXX: but when in the array they all contains the last match of the file
    return new Promise(resolve => {
        let alreadySearched = 0;
        buffers.forEach(
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
// XXX: this is the last match of the file
