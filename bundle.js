// terser egit

import fs from 'fs'


function func () {}
function return_null () { return null }
function return_this () { return this }
function return_true () { return true }
function return_false () { return false }

class tree {
  constructor (props) {
    this.func('tree', ['a', 'z', 'f'], props)
  }
}
tree.prototype.func = function (type, args, props) {
  this.type = type
  if (props) args.forEach(arg => this[arg] = props[arg])
}
tree.prototype.ascend = func
tree.prototype.branch = func
tree.prototype._copy = function (deep) {
  if (deep) {
    let self = this.copy()
    return self.transform(new transforms(function (root) {
      if (root != self) return root.copy(true)
    }))
  }
  return new this.constructor(this)
}
tree.prototype.copy = function (deep) {
  return this._copy(deep)
}
tree.prototype.equals = return_false
tree.prototype.observe = function (observer) {
  return observer.observe(this)
}
tree.prototype.transform = function (trees, trim) {
  trees.push(this)
  let transformed
  if (trees.before) transformed = trees.before(this, this.ascend, trim)
  if (transformed === undefined) {
    transformed = this
    this.ascend(transformed, trees)
    if (trees.after) {
      let after = trees.after(transformed, trim)
      if (after) transformed = after
    }
  }
  trees.pop()
  return transformed
}

function tray (array, trees) {
  let a
  let t = []
  for (let i = 0; i < array.length; i++) {
    a = array[i].transform(trees, true)
    a instanceof tree ? t.push(a) : a.v && t.push(...a.v)
  }
  return t
}

class arraya extends tree {
  constructor (props) {
    super()
    this.func('arraya', ['s', 'a', 'z', 'f'], props)
  }
}
arraya.prototype.ascend = function (self, trees) {
  self.s = tray(self.s, trees)
}
arraya.prototype.branch = function (push) {
  let i = this.s.length
  while (i--) push(this.s[i])
}
arraya.prototype.equals = return_true
arraya.prototype.observe = function (observer) {
  return observer.observe(this, function () {
    let i = this.s.length
    while (i--) this.s[i].observe(observer)
  })
}

class awaita extends tree {
  constructor (props) {
    super()
    this.func('awaita', ['e', 'a', 'z', 'f'], props)
  }
}
awaita.prototype.ascend = function (self, trees) {
  self.e = self.e.transform(trees)
}
awaita.prototype.branch = function (push) {
  push(this.e)
}
awaita.prototype.equals = return_true
awaita.prototype.observe = function (observer) {
  return observer.observe(this, function () {
    this.e.observe(observer)
  })
}

class spreada extends awaita {
  constructor (props) {
    super()
    this.func('spreada', ['e', 'a', 'z', 'f'], props)
  }
}

class tiea extends awaita {
  constructor (props) {
    super()
    this.func('tiea', ['e', 'a', 'z', 'f'], props)
  }
}

class unarya extends awaita {
  constructor (props) {
    super()
    this.func('unarya', ['o', 'e', 'a', 'z', 'f'], props)
  }
}
unarya.prototype.equals = function (other) {
  return this.o == other.o
}

class prefixa extends unarya {
  constructor (props) {
    super()
    this.func('prefixa', ['o', 'e', 'a', 'z', 'f'], props)
  }
}

class postfixa extends unarya {
  constructor (props) {
    super()
    this.func('postfixa', ['o', 'e', 'a', 'z', 'f'], props)
  }
}

class yielda extends awaita {
  constructor (props) {
    super()
    this.func('yielda', ['y', 'e', 'a', 'z', 'f'], props)
  }
}
yielda.prototype.equals = function (other) {
  return this.y == other.y
}

class binarya extends tree {
  constructor (props) {
    super()
    this.func('binarya', ['o', 'l', 'r', 'a', 'z', 'f'], props)
  }
}
binarya.prototype.ascend = function (self, trees) {
  self.l = self.l.transform(trees)
  self.r = self.r.transform(trees)
}
binarya.prototype.branch = function (push) {
  push(this.l)
  push(this.r)
}
binarya.prototype.equals = function (other) {
  return this.o == other.o
}
binarya.prototype.observe = function (observer) {
  return observer.observe(this, function () {
    this.l.observe(observer)
    this.r.observe(observer)
  })
}

class seta extends binarya {
  constructor (props) {
    super()
    this.func('seta', ['g', 'o', 'l', 'r', 'a', 'z', 'f'], props)
  }
}

function traverse (self, observer) {
  for (let i = 0, l = self.b.length; i < l; i++) {
    self.b[i].observe(observer)
  }
}

class blocka extends tree {
  constructor (props) {
    super()
    this.func('blocka', ['b', 'k', 'a', 'z', 'f'], props)
  }
}
blocka.prototype.ascend = function (self, trees) {
  self.b = tray(self.b, trees)
}
blocka.prototype.branch = function (push) {
  let i = this.b.length
  while (i--) push(this.b[i])
}
blocka.prototype.equals = return_true
blocka.prototype.observe = function (observer) {
  return observer.observe(this, function () {
    traverse(this, observer)
  })
}

class blockmenta extends blocka {
  constructor (props) {
    super()
    this.func('blockmenta', ['b', 'k', 'a', 'z', 'f'], props)
  }
}

class menta extends tree {
  constructor (props) {
    super()
    this.func('menta', ['a', 'z', 'f'], props)
  }
}

class statea extends menta {
  constructor (props) {
    super()
    this.func('statea', ['b', 'a', 'z', 'f'], props)
  }
}
statea.prototype.ascend = function (self, trees) {
  self.b = self.b.transform(trees)
}
statea.prototype.branch = function (push) {
  push(this.b)
}
statea.prototype.equals = return_true
statea.prototype.observe = function (observer) {
  return observer.observe(this, function () {
    this.b.observe(observer)
  })
}

class observes {
  constructor (callback) {
    this.callback = callback
    this.stack = []
  }
  observe (root, ascend) {
    this.stack.push(root)
  }
}

class transforms extends observes {
  constructor (before, after) {
    super()
    this.after = after
    this.before = before
  }
}

function out (la) {
  if (la == 'js') tree.prototype.show = func
}

function solve (file, folder) {
  return file.split('/').slice(0, -folder.indexOf('/')).join('/') + '/' + folder.split('./')[1]
}

function parse (opt, text) {
  if (false) {
    let of = solve(opt.of, mod.value)
    if (!opt.om.includes(of) && !opt.oq.includes(of)) opt.om.push(of)
  }
  return opt
}

function build (of, fo) {
  out('js')
  let opt = {top: new tree()}
  let om = [of]
  let oq = []
  let text
  while (om.length) {
    of = om[0]
    if (oq.includes(of)) {
      om.shift(1)
    } else {
      try {
        text = fs.readFileSync(of, 'utf-8')
      } catch (e) {
        text = ''
      }
      opt.of = of
      opt.om = om
      opt.oq = oq
      oq.push(of)
      opt = parse(opt, text)
      om = opt.om
    }
  }
  let output = opt.top.show()
  if (output) fs.writeFileSync(fo, output)
}

let args = process.argv
build(args[2], args[3])