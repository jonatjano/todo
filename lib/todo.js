'use babel';

// TODO: in /lib/todo.js

import service from './service';
import TodoView from './todo-view';
import {CompositeDisposable} from 'atom';

// TODO: complete this list
let commonPathToIgnore = ['\\*\\*/node_modules/\\*\\*'];

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
      description: 'add the following globs to ignored paths : ' + commonPathToIgnore.join(", "),
      type: 'boolean',
      default: true,
    },
    e_align_tags: {
      type: 'string',
      default: 'workspace',
      enum: ['active file', 'current project', 'current project + active file', 'workspace']
    },
  },

  commonPathToIgnore: commonPathToIgnore,

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
    // TODO: return service.findTodoItems(); directly
    let tmp = service.findTodoItems();
    console.log(tmp);
    return tmp;
  },

  onDidChangeVisible(visible) {
    this.todoView.toggle(visible);
  },
};

export default Todo;
