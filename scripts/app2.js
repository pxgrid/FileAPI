(function($, _, Backbone) {

  'use strict';

  // タスクのモデル
  var MyTask = Backbone.Model.extend({
    defaults: {
      title: ''
    },
    initialize: function() {
      var self = this;

      // IDが存在しないため
      // cidとは別に_.uniqueIdで与えておく
      var id = parseInt(_.uniqueId(), 10);
      self.set('id', id);
    }
  });

  // タスクのコレクション
  var MyTasks = Backbone.Collection.extend({
    model: MyTask
  });

  // タスクのビュー
  var MyTaskView = Backbone.View.extend({

    className: 'mod-myTasks',

    // イベントデリゲーション
    events: {
      'submit form'        : '_onSubmit',
      'click .btn-clear'   : '_onClickClear',
      'click .btn-remove'  : '_onClickRemove',
      'click .link-export' : '_onClickExport',
      'click .btn-import'  : '_onClickImport'
    },

    initialize: function() {
      var self = this;

      // コレクションを作っておく
      self.collection = new MyTasks();
      // インポート用にFileReaderを準備しておく
      self.reader = new FileReader();

      // 枠のレンダリング
      self.renderFrame();
      // イベントの監視
      self._eventify();
    },

    // イベント関連
    _eventify: function() {
      var self = this;
      // エクスポートリンクの更新
      var refreshExportLink = function() {
        if ( self.collection.length === 0 ) {
          self.$export.addClass('state-disabled');
          return;
        }
        self._makeBlobURL();
        self.$export
          .removeClass('state-disabled')
          .attr({
            download: self._getFileName(),
            href: self.url
          });
      };

      // 新しいタスクが登録されたとき
      self.collection.on('add', function(model) {
        self.renderTask(model);

        refreshExportLink();
      });

      // インポートしたときはresetイベントが呼ばれる
      self.collection.on('reset', function() {
        self.$tasks.empty();
        self.collection.each(function(model) {
          self.renderTask(model);
        });
        
        refreshExportLink();
      });

      // タスクを削除したとき
      self.collection.on('remove', function(model) {
        var id = 'task-' + model.get('id');
        $('#' + id).remove();

        refreshExportLink();
      });

      // FileReaderの読み込みが完了したとき
      self.reader.addEventListener('load', function() {
        self._import();
      }, false);
    },

    // 枠のレンダリング
    renderFrame: function() {
      var self = this;
      var $el = self.$el;

      $el.append(self.frameHtml);

      // 必要な要素をキャッシュしておく
      self.$tasks = $el.find('.mod-tasks');
      self.$title = $el.find('.input-title');
      self.$export = $el.find('.link-export');
      self.$file = $el.find('.input-file');
    },

    // タスク追加時のレンダリング
    renderTask: function(model) {
      var self = this;

      self.$tasks.append(
        _.template(self.taskHtml, { model: model })
      );
    },

    // 枠のHTMLテンプレート
    frameHtml: [
      '<h1>MyTask</h1>',
      '<form>',
        '<p class="mod-task-text">',
          '<input type="text" class="input-title" placeholder="タスクを入力してください" size="60">',
        '</p>',
        '<p class="mod-btns">',
          '<input type="submit" class="btn-add" value="タスクを追加">',
          '<input type="button" class="btn-clear" value="タスクをクリア">',
        '</p>',
      '</form>',
      '<p class="mod-import">',
        '<input type="file" class="input-file">',
        '<input type="button" class="btn-import" value="エクスポートしたデータをインポートする">',
      '</p>',
      '<ul class="mod-tasks"></ul>',
      '<p class="mod-export">',
        '<a href="#" class="link-export state-disabled">データのエクスポート</a>',
      '</p>'
    ].join(''),

    // タスクのHTMLテンプレート
    taskHtml: [
      '<li id="task-<%= model.get(\'id\') %>">',
        '<input type="button" class="btn-remove" value="削除" data-id="<%= model.get(\'id\') %>"> ',
        '<%= model.get(\'title\') %>',
      '</li>'
    ].join(''),

    // ファイル名の取得
    _getFileName: function() {
      return 'mytask' + (+new Date) + '.json';
    },

    // BlobとBlob URLを作る
    _makeBlobURL: function() {
      var self = this;
      var data = self.collection.toJSON();
      var type = { type: 'application\/json' };
      var blob = new Blob([JSON.stringify(data)], type);

      self.blob = blob;
      self.url = URL.createObjectURL(blob);
    },

    // タスクを追加ボタンがクリックされたとき
    _onSubmit: function(ev) {
      ev.preventDefault();

      var self = this;
      var title = self.$title.val();

      // コレクションにタスクを追加する
      self.collection.add({
        title: title
      });
    },

    // タスクをクリアボタンがクリックされたとき
    _onClickClear: function(ev) {
      var self = this;
     
      // コレクションをリセットする
      self.collection.reset();
    },

    // タスクの削除ボタンがクリックされたとき
    _onClickRemove: function(ev) {
      var self = this;
      var $target = $(ev.target).closest('input');
      var id = $target.attr('data-id');
      var model = self.collection.get(id);

      // コレクションから削除する
      self.collection.remove(model);
    },

    // エクスポートリンクがクリックされたとき
    _onClickExport: function(ev) {
      var self = this;

      // IE10のみ挙動を上書き
      if ( window.navigator.msSaveBlob ) {
        ev.preventDefault();
        window.navigator.msSaveBlob(
          self.blob,
          self._getFileName()
        );
      }
    },

    // インポートボタンがクリックされたとき
    _onClickImport: function(ev) {
      var self = this;
      var inputFile = self.$el.find('.input-file')[0];
      var file = inputFile.files[0];

      if ( !self._validate(file) ) {
        return;
      }
      self.reader.readAsText(file);
    },

    // インポートするファイルの簡易バリデーション
    _validate: function(file) {
      if ( !file ) {
        alert('ファイルを選択してください');
        return false;
      }
      if ( !/^mytask/.test(file.name) ) {
        alert('エクスポートしたデータファイルを選択してください');
        return false;
      }
      return true;
    },

    // インポートの実行
    _import: function() {
      var self = this;
      var reader = self.reader;
      var data;
     
      // ファイルに何らかの不具合があった場合は
      // アラートを表示して何もしない
      try {
        data = JSON.parse(reader.result);
        self.collection.reset(data);
      } catch (e) {
        alert('ファイルが壊れているため、インポートに失敗しました');
      }
    }

  });

  var $myTasks = $('.mod-myTasks');
  var myTaskView = new MyTaskView();

  $myTasks.append(myTaskView.$el);

}(jQuery, _, Backbone));
