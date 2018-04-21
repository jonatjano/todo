'use babel';

// TODO: in /lib/service.js
import Todo from './todo.js';
import {TextBuffer} from 'atom';

function byDirectoriesThenFiles(a, b) {
  // TODO: do not use the icon to test if it is a directory
  if (a.icon === b.icon) {
    return 0;
  } else if (a.icon === 'icon-file-directory') {
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
      console.log(tmp[0].substring(tmp[0].lastIndexOf("/") + 1) + "/" + tmp[1]);
      result.relativePath = tmp[0].substring(tmp[0].lastIndexOf("/") + 1) + "/" + tmp[1];
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
    	return '!' + path;
        // path = path.replace(/[/]/g, '[/]');
    	// path = path.replace(/[.]/g, '\.');
    	// path = path.replace(/[*]{2}[/]/g, '.*');
    	// return path.replace(/[/][*]{2}/g, '.*');
    });

	if(atom.config.get("todo.d_ignoreCommonPaths")) {
		otherNotIgnoredPaths = Todo.commonPathToIgnore.map(function(path) {
			path = path.replace(/\\/g, '');
			return '!' + path;
        	// path = path.replace(/[/]/g, '[/]');
        	// path = path.replace(/[.]/g, '[.]');
        	// path = path.replace(/[*]{2}/g, '.*');
        	// return path.replace(/[*]{2}/g, '.*');
		});

		ignoredPaths = [...ignoredPaths, ...otherNotIgnoredPaths];
	}

    // let fileList = atom.project.getDirectories()[0].getEntriesSync();
    // while(
    //     fileList.some((elem) => { return elem.isDirectory(); })
    // ) {
    //     fileList = fileList.map((elem) => {
    //         for (let ip of ignoredPaths) {
    //             if (elem.path.match(ip) != null) {
    //                 return [];
    //             };
    //         };
    //         return (elem.isDirectory())? elem.getEntriesSync() : elem;
    //     });
    //     fileList = fileList.reduce((acc, val) => acc.concat(val), []);
    // };
    // console.log(fileList);
    //
    // let buffers = fileList.map(elem => new TextBuffer(elem.read(true)));
    // console.log(buffers);
    //
    // // TODO: find why find array is empty
    // let find = [];
    // // buffers[10].scan("TODO", (match) => {
    // //     find.push(match.matchText);
    // // });
    // buffers.forEach(elem => elem.scan("TODO", (match) => {
    //     find.push(match.matchText);
    // }));
    // console.log(find);

    // console.log("test/azer/er".match(".*/azer/.*"));
    // console.log(atom.workspace.getTextEditors()); // return opened TextEditor (use TextEditor.scan())
    // console.log(atom.project.getDirectories()); // return the opened project as Directory

    // console.log(ignoredPaths);
    // console.log('ignoredPaths');
    // let openedFiles = atom.workspace.getTextEditors();
    // let openedFilesPaths = openedFiles.map(file => "**/" + file.getPath() + "/**");
    // console.log(openedFilesPaths);
    // console.log('openedFilesPaths');
    // // ignoredPaths = [...ignoredPaths, ...openedFilesPaths];
    // console.log(ignoredPaths);
    // console.log('ignoredPaths');

    // set path to everything if no path is ignored
    function getPaths() {
        if (ignoredPaths.length != 0) {
            return ignoredPaths;
        }
        return ['*'];
    }

    options = {
      paths: getPaths(),
      // TODO: restore this after working with slow searches
      // paths: [
      //   '*',
      //   'node_modules/',
      // ],
      onPathsSearched: function (count) {
        return atom.emitter.emit('todo:pathSearched', count);
      },
    };


    return new Promise(resolve => {
      return atom.workspace.scan(regex, options, iterator)

      .then(() => {
        return results.sort(function(a, b) {
          return a.filePath.localeCompare(b.filePath);
        });
      })
      .then(() => {
        return results.filter((elem, pos, arr) => {
          if (pos + 1 != arr.length && elem.filePath == arr[pos + 1].filePath) {
            return false;
          };
          return true;
        });
      })
      .then(resolve);
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
