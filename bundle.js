// node done

import fs from 'fs'
import path from 'path'

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
  if (props) args.forEach(arg => { this[arg] = props[arg] })
}

class ment extends tree {
  constructor (props) {
    super()
    this.func('ment', ['a', 'z', 'f'], props)
  }
}

function solve (file, dir) {
  return path.join(path.dirname(file), dir)
}

function out (la) {
  if (la == 'js') tree.prototype.show = func
}

function parse (text, opt) {
  return opt
}

function build (of, fo, opt={}) {
  out(opt.la)
  opt.top = new tree({})
  let ob = []
  let om = [of]
  let text
  while (om.length) {
    of = om[0]
    if (ob.includes(of)) {
      om.shift(1)
    } else {
      try {
        text = fs.readFileSync(of, 'utf-8')
      } catch (e) {
        text = ''
      }
      opt.of = of
      opt.om = om
      opt.ob = ob
      ob.push(of)
      opt = parse(text, opt)
      om = opt.om
    }
  }
}

let args = process.argv
build(args[2], args[3], args[4])
