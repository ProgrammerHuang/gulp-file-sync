'use strict';

var fs = require('fs-extra'),
    path = require('path'),
    expect = require('chai').expect,
    fileSync = require('..');

// 工具方法

// 判断一个元素是否存在于某个数组中
var isElementInArray = function(_array, _element) {
  for (var _i = 0; _i < _array.length; _i += 1 ) {
    if (_element === _array[_i]) {
      return true;
    }
  }
  return false;
}

// 相关文件目录
var srcDirectory = 'test/src',
    destDirectory = 'test/dest',
    updateDirectory = 'test/update';

describe('fileSync(src, dest, options)', function () {

  var _fileSyncWithOption = function(_source, _options) {
    _options = _options || {};
    _options.addFileCallback = function() {};
    _options.deleteFileCallback = function() {};
    _options.updateFileCallback = function() {};

    fileSync(_source, destDirectory, _options);
  }

  // 确保目标目录存在
  fs.ensureDirSync(destDirectory);
  // 清空目标目录，准备开始测试流程
  var _clearDestDirectory = function() {
    var _destFiles = fs.readdirSync(destDirectory);
    _destFiles.forEach(function(_file) {
      var _fullPathDest = path.join(destDirectory, _file),
          _existsDest = fs.existsSync(_fullPathDest);
      
      if (_existsDest) {
        fs.removeSync(_fullPathDest);
      }
    });
  }
  _clearDestDirectory();

  // 测试参数遗漏时是否 throw
  it('Throws when `src` is missing or `src` is not a string', function () {
    expect(fileSync).to.throw('Missing source directory or type is not a string.');
  });

  // 测试参数遗漏时是否 throw
  it('Throws when `dest` is missing or `dest` is not a string', function () {
    expect(fileSync.bind(undefined, srcDirectory)).to.throw('Missing destination directory or type is not a string.');
  });

  // 测试非递归同步 
  describe('non-recursively', function() {

    before(function() {
      _fileSyncWithOption(srcDirectory, { recursive: false }); 
    });

    it('Sync directory non-recursively', function () {
      var _srcFiles = fs.readdirSync(srcDirectory);
      _srcFiles.forEach(function(_file) {
        var _filePathSrc = path.join(srcDirectory, _file),
            _statSrc = fs.statSync(_filePathSrc),
            _fullPathDest = path.join(destDirectory, _file);

        if (_statSrc.isDirectory()) {
          expect(fs.existsSync(_fullPathDest)).to.be.false;
        } else {
          expect(fs.existsSync(_fullPathDest)).to.be.true;
        }
      });
    });
  });

  // 测试递归同步 
  describe('recursively', function() {

    before(function() {
      _fileSyncWithOption(srcDirectory, { recursive: true }); 
    });

    it('Sync directory recursively', function () {
      var _srcFiles = fs.readdirSync(srcDirectory);
      _srcFiles.forEach(function(_file) {
        var _filePathSrc = path.join(srcDirectory, _file),
            _fullPathDest = path.join(destDirectory, _file);

        expect(fs.existsSync(_fullPathDest)).to.be.true;
      });
    });
  });

  // 测试排除文件
  describe('ignore', function() {

    var _shouldIgnoreFile = 'ignore.png';
    describe('ignore by function', function() {
      before(function() {
        _clearDestDirectory();
        _fileSyncWithOption(srcDirectory, { ignore(_dir, _file) {
          return _file === _shouldIgnoreFile;
        } }); 
      });

      it('Sync directory but ignore a file', function () {
        var _srcFiles = fs.readdirSync(srcDirectory);
        _srcFiles.forEach(function(_file) {
          var _filePathSrc = path.join(srcDirectory, _file),
              _fullPathDest = path.join(destDirectory, _file);

          if (_file === _shouldIgnoreFile) {
            expect(fs.existsSync(_fullPathDest)).to.be.false;
          } else {
            expect(fs.existsSync(_fullPathDest)).to.be.true;
          }
        });
      });
    });

    var _shouldIgnoreFileList = ['ignore.png', 'ignore_other.png'];
    describe('ignore by array', function() {
      before(function() {
        _clearDestDirectory();
        _fileSyncWithOption(srcDirectory, { ignore: _shouldIgnoreFileList }); 
      });

      it('Sync directory but ignore some files', function () {
        var _srcFiles = fs.readdirSync(srcDirectory);
        _srcFiles.forEach(function(_file) {
          var _filePathSrc = path.join(srcDirectory, _file),
              _fullPathDest = path.join(destDirectory, _file);

          if (isElementInArray(_shouldIgnoreFileList, _file)) {
            expect(fs.existsSync(_fullPathDest)).to.be.false;
          } else {
            expect(fs.existsSync(_fullPathDest)).to.be.true;
          }
        });
      });
    });

  });

  // 测试更新和删除文件
  var _specialDir = '/ignore.png';
  describe('update and delete', function() {

    before(function() {
      fs.mkdirSync(updateDirectory + _specialDir);
      _fileSyncWithOption(updateDirectory); 
    });

    it('Sync directory to update and delete some files', function () {
      var _destFiles = fs.readdirSync(destDirectory);
      _destFiles.forEach(function(_file) {
        var _filePathDest = path.join(destDirectory, _file),
            _fullPathSrc = path.join(destDirectory, _file);

        expect(fs.existsSync(_fullPathSrc)).to.be.true;
      });
    });

    after(function() {
      fs.removeSync(updateDirectory + _specialDir);
    });
  });

  // 测试回调函数
  describe('callback testing', function() {

    var _add = {},
        _update = {},
        _delete = {};

    before(function() {
      fileSync(srcDirectory, destDirectory, {
        beforeAddFileCallback(_fullPathSrc) {
          _add.before = _fullPathSrc;
        },
        addFileCallback(_fullPathSrc, _fullPathDist) {
          _add.done = _fullPathSrc;
        },
        updateFileCallback(_fullPathSrc, _fullPathDist) {},
        deleteFileCallback(_fullPathSrc, _fullPathDist) {}
      }); 

      fileSync(updateDirectory, destDirectory, {
        addFileCallback(_fullPathSrc, _fullPathDist) {},
        beforeUpdateFileCallback(_fullPathSrc) {
          _update.before = _fullPathSrc;
        },
        beforeDeleteFileCallback(_fullPathSrc) {
          _delete.before = _fullPathSrc;
        },
        updateFileCallback(_fullPathSrc, _fullPathDist) {
          _update.done = _fullPathSrc;
        },
        deleteFileCallback(_fullPathSrc, _fullPathDist) {
          _delete.done = _fullPathSrc;
        }
      });
    });

    it('Test the callbacks of add file', function () {
      expect(_add).to.have.deep.property('before', _add.done);
    });

    it('Test the callbacks of update file', function () {
      expect(_update).to.have.deep.property('before', _update.done);
    });

    it('Test the callbacks of delete file', function () {
      expect(_delete).to.have.deep.property('before', _delete.done);
    });
  });

});
