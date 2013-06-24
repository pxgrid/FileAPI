(function($, _, Backbone) {

  'use strict';
 
  // Fileオブジェクトを内包するモデル
  var FileModel = Backbone.Model.extend({

    defaults: {
      file: '',
      dataURL: ''
    },

    initialize: function(attr) {
      var self = this;

      // FileReaderを準備しておく
      self.reader = new FileReader();
      self._eventify();
    },

    _eventify: function() {
      var self = this;

      // ファイルの読み込みが完了したらdataURLに値をセット
      // その後、readerLoadイベントを発行する
      self.reader.addEventListener('load', function() {
        self.set('dataURL', self.reader.result);
        self.trigger('readerLoad', self);
      }, false);
    },

    // ファイルを読み込むメソッド
    readFile: function() {
      var self = this;
      var reader = self.reader;

      reader.readAsDataURL(this.get('file'));
    }

  });

  // FileListを元にしたコレクション
  var FileCollection = Backbone.Collection.extend({

    model: FileModel,

    // それぞれのModelのreadFileコールする
    readFiles: function() {
      var self = this;

      this.each(function(file) {
        file.readFile();
      });
    }

  });

  // UI部分
  var FileView = Backbone.View.extend({

    // イベントデリゲーション
    events: {
      'change .file'  : '_onFileChange',
      'click .submit' : '_onClickButton'
    },

    initialize: function($input, $preview) {
      var self = this;
     
      // Collectionを初期化しておく
      self.collection = new FileCollection();
      // UIをレンダリングする
      self.render();
      self._eventify();
    },

    _eventify: function() {
      var self = this;

      // Modelが発行するイベントをキャッチして
      // プレビューエリア内をレンダリングする
      self.collection.on('readerLoad', self.renderPreview, self);
    },

    // UIをレンダリングするメソッド
    render: function() {
      var self = this;
      var $el = self.$el;

      $el.append(self.html);

      self.$input = $el.find('.file');
      self.$preview = $el.find('.preview');
    },

    // プレビューエリア内をレンダリングするメソッド
    renderPreview: function(model) {
      var self = this;

      self.$preview.append(
        _.template(
          self.previewHtml,
          { model: model }
        )
      );
    },

    // UI部分のテンプレート
    html: [
      '<p>選択できるファイルはJPEG画像ファイルです。<br>',
      '<input type="file" class="file" multiple></p>',
      '<p><input type="button" class="submit" value="選択したファイルのプレビューを表示する"></p>',
      '<div class="preview"></div>'
    ].join(''),

    // プレビューエリアに追加するテンプレート
    previewHtml: [
      '<p>',
        '<img src="<%= model.get(\'dataURL\') %>"><br>',
        '<span class="name">name: <%= model.get(\'file\')[\'name\'] %></span><br>',
        '<span class="size">size: <%= model.get(\'file\')[\'size\'] %>(byte)</span>',
      '</p>'
    ].join(''),

    // Filesオブジェクトを扱いやすいように作り直す
    // ModelにはFileオブジェクトを直接渡せないので、
    // ひとつ下げて持たせておく
    _getFiles: function(files) {
      var self = this;
      var ret = [];

      _.each(files, function(file, key) {
        if ( !files.hasOwnProperty(key) || key === 'length' ) {
          return;
        }
        // fileのMIMEタイプはimage/jpegだけを許可する
        // それ以外は無視する
        if ( file.type !== 'image/jpeg' ) {
          return;
        }
        // ひとつ下げる
        ret.push({ file: file });
      });
      return ret;
    },

    // 配列filesからCollectionを作る
    _getCollection: function(files) {
      var self = this;
      
      self.collection.reset(files);
    },

    // input[type="file"]でファイルが選択されたとき
    _onFileChange: function(ev) {
      var self = this;
      var target = ev.target;
      var files = self._getFiles(target.files);

      self._getCollection(files);
    },

    // プレビューエリアを表示するボタンをクリックしたとき
    _onClickButton: function() {
      var self = this;

      // プレビューエリアを空にする
      self.$preview.empty();

      // Collectionに何もない場合はアラートを出す
      if ( !self.collection || !self.collection.length ) {
        return alert('先にファイルを選択してください');
      }
      // 問題なければCollectionのreadFilesメソッドをコールする
      self.collection.readFiles();
    }

  });

  var $modPreviewImg = $('.mod-previewImg');
  var fileView = new FileView();

  $modPreviewImg.append(fileView.$el);

}(jQuery, _, Backbone));
