'use babel';

// TODO: in /lib/todo.js
import service from './service';
import TodoView from './todo-view';
import {CompositeDisposable} from 'atom';

let commonPathToIgnore = [
    '\\*\\*/.git/\\*\\*',          '\\*\\*/CVS/\\*\\*',           '\\*\\*/.svn/\\*\\*',         '\\*\\*/.hg/\\*\\*',
    '\\*\\*/.lock-wscript/\\*\\*', '\\*\\*/.wafpickle-N/\\*\\*',  '\\*\\*/.\\*.swp/\\*\\*',     '\\*\\*/.DS_Store/\\*\\*',
    '\\*\\*/npm-debug.log/\\*\\*', '\\*\\*/.npmrc/\\*\\*',        '\\*\\*/node_modules/\\*\\*', '\\*\\*/config.gypi/\\*\\*',
    '\\*\\*/*.orig/\\*\\*',        '\\*\\*/package-lock.json/\\*\\*'
];

let scopes = ['active file', 'opened files', 'first project', 'first project + opened files', 'projects of opened files', 'workspace'];

const Todo = {
  todoView: null,
  panel: null,
  subscriptions: null,

  config: {
    a_pattern: {
      title: 'RegExp Pattern',
      description: 'used in conjunction with RegExp Flags to find todo items in your code',
      type: 'string',
      default: '(TODO|FIXME|CHANGED|XXX|IDEA|HACK|NOTE|REVIEW|NB|BUG|QUESTION|COMBAK|TEMP)\\:.+',
    },
    b_flags: {
      title: 'RegExp Flags',
      type: 'string',
      default: 'g',
    },
    c_ignorePaths: {
      title: 'Ignored Paths',
      description: 'comma-separated [globs](https://github.com/isaacs/node-glob#glob-primer) that should not be searched (ex: \\*\\*/ignore-me/\\*\\*, \\*\\*/and-me/\\*\\*)',
      type: 'array',
      default: [],
      items: {
        type: 'string',
      },
    },
    d_ignoreCommonPaths: {
      title: 'Ignore commonly ignored paths',
      description: 'Add the following globs to ignored paths : ' + commonPathToIgnore.join(", "),
      type: 'boolean',
      default: true,
    },
    e_todoScope: {
      title: 'The scope',
      description: 'The scope where we search for todos',
      type: 'string',
      default: 'opened files',
      enum: scopes
    },
  },

  commonPathToIgnore: commonPathToIgnore,
  scopes: scopes,

  activate(state) {
    this.todoView = new TodoView(state.todoViewState);

    this.panel = atom.workspace.addRightPanel({
      item: this.todoView.getElement(),
      visible: false,
    });

    this.subscriptions = new CompositeDisposable;

    this.subscriptions.add(
      atom.commands.add('atom-workspace', {
        'todo:toggle': this.toggle.bind(this),
      }),

       this.panel.onDidChangeVisible(this.onDidChangeVisible.bind(this))
    );

    atom.emitter.on('todo:refresh', this.loadItems.bind(this));
    atom.emitter.on('todo:close', this.close.bind(this));
  },


  deactivate() {
    this.panel.destroy();
    this.subscriptions.dispose();
    return this.todoView.destroy();
  },

  serialize() {
    return {
      todoViewState: this.todoView.serialize(),
    };
  },

  close() {
    return this.panel.hide();
  },

  toggle() {
    if (this.panel.isVisible()) {
      this.close();
    } else {
      this.panel.show();
      atom.emitter.emit('todo:show');
      return this.loadItems();
    }
  },

  loadItems() {
    return this.getItems().then(this.todoView.renderItems);
  },

  getItems() {
    return service.findTodoItems();
  },

  onDidChangeVisible(visible) {
    this.todoView.toggle(visible);
  },
};

export default Todo;
