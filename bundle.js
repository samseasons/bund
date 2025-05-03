// terser egit

import fs from 'fs'


function func () {}
function return_null () { return null }
function return_this () { return this }
function return_true () { return true }
function return_false () { return false }

class tree {
  constructor (props) {
    this.func('tree', ['start', 'end', 'file'], props)
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
  let a, t = []
  for (let i = 0; i < array.length; i++) {
    a = array[i].transform(trees, true)
    a instanceof tree ? t.push(a) : a.v && t.push(...a.v)
  }
  return t
}

class ast_array extends tree {
  constructor (props) {
    super()
    this.func('ast_array', ['elements', 'start', 'end', 'file'], props)
  }
}
ast_array.prototype.ascend = function (self, trees) {
  self.elements = tray(self.elements, trees)
}
ast_array.prototype.branch = function (push) {
  let i = this.elements.length
  while (i--) push(this.elements[i])
}
ast_array.prototype.equals = return_true
ast_array.prototype.observe = function (observer) {
  return observer.observe(this, function () {
    let i = this.elements.length
    while (i--) this.elements[i].observe(observer)
  })
}

class ast_await extends tree {
  constructor (props) {
    super()
    this.func('ast_await', ['expr', 'start', 'end', 'file'], props)
  }
}
ast_await.prototype.equals = return_true
ast_await.prototype.observe = function (observer) {
  return observer.observe(this, function () {
    this.expr.observe(observer)
  })
}
ast_await.prototype.branch = function (push) {
  push(this.expr)
}
ast_await.prototype.ascend = function (self, trees) {
  self.expr = self.expr.transform(trees)
}

class ast_spread extends ast_await {
  constructor (props) {
    super()
    this.func('ast_spread', ['expr', 'start', 'end', 'file'], props)
  }
}

class ast_chain extends ast_await {
  constructor (props) {
    super()
    this.func('ast_chain', ['expr', 'start', 'end', 'file'], props)
  }
}

class ast_unary extends ast_await {
  constructor (props) {
    super()
    this.func('ast_unary', ['operator', 'expr', 'start', 'end', 'file'], props)
  }
}
ast_unary.prototype.equals = function (other) {
  return this.operator == other.operator
}

class ast_unary_prefix extends ast_unary {
  constructor (props) {
    super()
    this.func('ast_unary_prefix', ['operator', 'expr', 'start', 'end', 'file'], props)
  }
}

class ast_unary_postfix extends ast_unary {
  constructor (props) {
    super()
    this.func('ast_unary_postfix', ['operator', 'expr', 'start', 'end', 'file'], props)
  }
}

class ast_yield extends ast_await {
  constructor (props) {
    super()
    this.func('ast_yield', ['expr', 'star', 'start', 'end', 'file'], props)
  }
}
ast_yield.prototype.equals = function (other) {
  return this.star == other.star
}

class ast_binary extends tree {
  constructor (props) {
    super()
    this.func('ast_binary', ['operator', 'left', 'right', 'start', 'end', 'file'], props)
  }
}
ast_binary.prototype.equals = function (other) {
  return this.operator == other.operator
}
ast_binary.prototype.observe = function (observer) {
  return observer.observe(this, function () {
    this.left.observe(observer)
    this.right.observe(observer)
  })
}
ast_binary.prototype.branch = function (push) {
  push(this.left)
  push(this.right)
}
ast_binary.prototype.ascend = function (self, trees) {
  self.left = self.left.transform(trees)
  self.right = self.right.transform(trees)
}

class ast_assign extends ast_binary {
  constructor (props) {
    super()
    this.func('ast_assign', ['logical', 'operator', 'left', 'right', 'start', 'end', 'file'], props)
  }
}

class ast_default_assign extends ast_binary {
  constructor (props) {
    super()
    this.func('ast_default_assign', ['operator', 'left', 'right', 'start', 'end', 'file'], props)
  }
}

class ast_call extends tree {
  constructor (props) {
    super()
    this.func('ast_call', ['expr', 'args', 'optional', 'anno', 'start', 'end', 'file'], props)
  }
}

class ast_new extends ast_call {
  constructor (props) {
    super()
    this.func('ast_new', ['expr', 'args', 'optional', 'anno', 'start', 'end', 'file'], props)
  }
}
ast_call.prototype.equals = return_true
ast_call.prototype.observe = function (observer) {
  return observer.observe(this, function () {
    let i = this.args.length
    while (i--) this.args[i].observe(observer)
    this.expr.observe(observer)
  })
}
ast_call.prototype.branch = function (push) {
  let i = this.args.length
  while (i--) push(this.args[i])
  push(this.expr)
}
ast_call.prototype.ascend = function (self, trees) {
  self.expr = self.expr.transform(trees)
  self.args = tray(self.args, trees, false)
}

class ast_conditional extends tree {
  constructor (props) {
    super()
    this.func('ast_conditional', ['condition', 'consequent', 'alt', 'start', 'end', 'file'], props)
  }
}
ast_conditional.prototype.equals = return_true
ast_conditional.prototype.observe = function (observer) {
  return observer.observe(this, function () {
    this.condition.observe(observer)
    this.consequent.observe(observer)
    this.alt.observe(observer)
  })
}
ast_conditional.prototype.branch = function (push) {
  push(this.alt)
  push(this.consequent)
  push(this.condition)
}
ast_conditional.prototype.ascend = function (self, trees) {
  self.condition = self.condition.transform(trees)
  self.consequent = self.consequent.transform(trees)
  self.alt = self.alt.transform(trees)
}

class ast_destructure extends tree {
  constructor (props) {
    super()
    this.func('ast_destructure', ['names', 'is_array', 'start', 'end', 'file'], props)
  }
}
ast_destructure.prototype.equals = function (other) {
  return this.is_array === other.is_array
}
ast_destructure.prototype.observe = function (observer) {
  return observer.observe(this, function () {
    this.names.forEach(function (name) {
      name.observe(observer)
    })
  })
}
ast_destructure.prototype.branch = function (push) {
  let i = this.names.length
  while (i--) push(this.names[i])
}
ast_destructure.prototype.ascend = function (self, trees) {
  self.names = tray(self.names, trees)
}

class ast_directive extends tree {
  constructor (props) {
    super()
    this.func('ast_directive', ['value', 'quote', 'start', 'end', 'file'], props)
  }
}

class ast_literal extends tree {
  constructor (props) {
    super()
    this.func('ast_literal', ['start', 'end', 'file'], props)
  }
}
ast_literal.prototype.getValue = function () {
  return this.value
}

class ast_atom extends ast_literal {
  constructor (props) {
    super()
    this.func('ast_atom', ['start', 'end', 'file'], props)
  }
}
ast_atom.prototype.equals = return_true

class ast_false extends ast_atom {
  constructor (props) {
    super()
    this.func('ast_false', ['start', 'end', 'file'], props)
  }
}
ast_false.prototype.value = false

class ast_true extends ast_atom {
  constructor (props) {
    super()
    this.func('ast_true', ['start', 'end', 'file'], props)
  }
}
ast_true.prototype.value = true

class ast_hole extends ast_atom {
  constructor (props) {
    super()
    this.func('ast_hole', ['start', 'end', 'file'], props)
  }
}
ast_hole.prototype.value = func

class ast_infinity extends ast_atom {
  constructor (props) {
    super()
    this.func('ast_infinity', ['start', 'end', 'file'], props)
  }
}
ast_infinity.prototype.value = 1 / 0

class ast_nan extends ast_atom {
  constructor (props) {
    super()
    this.func('ast_nan', ['start', 'end', 'file'], props)
  }
}
ast_nan.prototype.value = 0 / 0

class ast_null extends ast_atom {
  constructor (props) {
    super()
    this.func('ast_null', ['start', 'end', 'file'], props)
  }
}
ast_null.prototype.value = null

class ast_undefined extends ast_atom {
  constructor (props) {
    super()
    this.func('ast_undefined', ['start', 'end', 'file'], props)
  }
}
ast_undefined.prototype.value = func

class ast_number extends ast_literal {
  constructor (props) {
    super()
    this.func('ast_number', ['value', 'raw', 'start', 'end', 'file'], props)
  }
}
ast_number.prototype.equals = function (other) {
  return this.value == other.value
}

class ast_big_int extends ast_literal {
  constructor (props) {
    super()
    this.func('ast_big_int', ['value', 'start', 'end', 'file'], props)
  }
}
ast_big_int.prototype.equals = function (other) {
  return this.value == other.value
}

class ast_reg_exp extends ast_literal {
  constructor (props) {
    super()
    this.func('ast_reg_exp', ['value', 'start', 'end', 'file'], props)
  }
}
ast_reg_exp.prototype.equals = function (other) {
  return this.value.flags === other.value.flags && this.value.source === other.value.source
}

class ast_string extends ast_literal {
  constructor (props) {
    super()
    this.func('ast_string', ['value', 'quote', 'start', 'end', 'file'], props)
  }
}
ast_string.prototype.equals = function (other) {
  return this.value == other.value
}

function member (name, array) { return array.includes(name) }
function owns (obj, prop) { return Object.prototype.hasOwnProperty.call(obj, prop) }
function list_overhead (array) { return array.length && array.length - 1 }
function lambda_modifiers (func) { return func.gen ? 1 : 0 + func.sync ? 6 : 0}
function key_size (key) { return typeof key == 'string' ? key.length : 0}
function chars (string) { return string.split('') }
function static_size (sttc) { return sttc ? 7 : 0}

function defaults (args, defs) {
  if (args === true) args = {}
  const result = args || {}
  for (const i in defs) {
    result[i] = (!args || !owns(args, i)) ? defs[i] : (args && owns(args, i)) ? args[i] : defs[i]
  }
  return result
}

function make_node (ctor, orig, props) {
  if (!props) props = {}
  if (orig) {
    if (!props.start) props.start = orig.start
    if (!props.end) props.end = orig.end
  }
  return new ctor(props)
}

function push_uniq (array, el) {
  if (!member(el, array)) array.push(el)
}

function remove (array, el) {
  for (let i = array.length; --i >= 0;) {
    if (array[i] === el) array.splice(i, 1)
  }
}

function merge_sort (array, cmp) {
  if (array.length < 2) return array.slice()
  function merge (a, b) {
    const r = []
    let ai = 0, bi = 0, i = 0
    while (ai < a.length && bi < b.length) {
      r[i++] = cmp(a[ai], b[bi]) <= 0 ? a[ai++] : b[bi++]
    }
    if (ai < a.length) r.push.apply(r, a.slice(ai))
    if (bi < b.length) r.push.apply(r, b.slice(bi))
    return r
  }
  function _merge_sort (a) {
    if (a.length <= 1) return a
    const m = Math.floor(a.length / 2)
    let left = a.slice(0, m), right = a.slice(m)
    left = _merge_sort(left)
    right = _merge_sort(right)
    return merge(left, right)
  }
  return _merge_sort(array)
}

function make_set (words) {
  if (!Array.isArray(words)) words = words.split(' ')
  return new Set(words.sort())
}

function map_add (map, key, value) {
  map.has(key) ? map.get(key).push(value) : map.set(key, [ value ])
}

const line_escape = {'\0': '0', '\n': 'n', '\r': 'r', '\u2028': 'u2028', '\u2029': 'u2029'}
function escape_regexp (match, offset) {
  const escaped = source[offset - 1] == '\\' && (source[offset - 2] != '\\'
    || /(?:^|[^\\])(?:\\{2})*$/.test(source.slice(0, offset - 1)))
  return (escaped ? '' : '\\') + line_escape[match]
}

function source_regexp (source) {
  return source.replace(/[\0\n\r\u2028\u2029]/g, escape_regexp)
}

const regexp_is_safe = (source) => /^[\\/|\0\s\w^$.[\]()]*$/.test(source)
const all_flags = 'dgimsuyv'
function sort_regexp_flags (flags) {
  const existing_flags = new Set(flags.split(''))
  let outflags = ''
  for (const flag of all_flags) {
    if (existing_flags.has(flag)) {
      outflags += flag
      existing_flags.delete(flag)
    }
  }
  if (existing_flags.size) existing_flags.forEach(flag => outflags += flag)
  return outflags
}

function has_annotation (root, annotation) {
  return root.anno & annotation
}

function set_annotation (root, annotation) {
  root.anno |= annotation
}

function _splice (val) {
  return {v: val}
}

function copy_block_scope (deep) {
  const copy = this._copy(deep)
  if (this.blocks) copy.blocks = this.blocks.copy()
  return copy
}

function traverse (self, observer) {
  for (let i = 0, l = self.body.length; i < l; i++) {
    self.body[i].observe(observer)
  }
}

class ast_state extends tree {
  constructor (props) {
    super()
    this.func('ast_state', ['start', 'end', 'file'], props)
  }
}

class ast_statement extends ast_state {
  constructor (props) {
    super()
    this.func('ast_statement', ['body', 'start', 'end', 'file'], props)
  }
}
ast_statement.prototype.ascend = function (self, trees) {
  self.body = self.body.transform(trees)
}
ast_statement.prototype.branch = function (push) {
  push(this.body)
}
ast_statement.prototype.equals = return_true
ast_statement.prototype.observe = function (observer) {
  return observer.observe(this, function () {
    this.body.observe(observer)
  })
}

class ast_debugger extends ast_state {
  constructor (props) {
    super()
    this.func('ast_debugger', ['start', 'end', 'file'], props)
  }
}
ast_debugger.prototype.equals = return_true

class ast_block extends tree {
  constructor (props) {
    super()
    this.func('ast_block', ['body', 'blocks', 'start', 'end', 'file'], props)
  }
}
ast_block.prototype.equals = return_true
ast_block.prototype.observe = function (observer) {
  return observer.observe(this, function () {
    traverse(this, observer)
  })
}
ast_block.prototype.branch = function (push) {
  let i = this.body.length
  while (i--) push(this.body[i])
}
ast_block.prototype.ascend = function (self, trees) {
  self.body = tray(self.body, trees)
}

class ast_block_statement extends ast_block {
  constructor (props) {
    super()
    this.func('ast_block_statement', ['body', 'blocks', 'start', 'end', 'file'], props)
  }
}

class ast_empty_statement extends tree {
  constructor (props) {
    super()
    this.func('ast_empty_statement', ['start', 'end', 'file'], props)
  }
}
ast_empty_statement.prototype.equals = return_true

class ast_statement_with_body extends tree {
  constructor (props) {
    super()
    this.func('ast_statement_with_body', ['body', 'start', 'end', 'file'], props)
  }
}

class ast_labeled_statement extends ast_statement_with_body {
  constructor (props) {
    super()
    this.func('ast_labeled_statement', ['label', 'body', 'start', 'end', 'file'], props)
  }
}
ast_labeled_statement.prototype.equals = function (other) {
  return this.label.name === other.label.name
}
ast_labeled_statement.prototype.observe = function (observer) {
  return observer.observe(this, function () {
    this.label.observe(observer)
    this.body.observe(observer)
  })
}
ast_labeled_statement.prototype.branch = function (push) {
  push(this.body)
  push(this.label)
}
ast_labeled_statement.prototype.copy = function (deep) {
  const root = this._copy(deep)
  if (deep) {
    const label = root.label, defined = this.label
    root.observe(new observes(function (root) {
      if (root instanceof ast_loop_control && root.label && root.label.thedef == defined) {
        root.label.thedef = label
        label.references.push(root)
      }
    }))
  }
  return root
}
ast_labeled_statement.prototype.ascend = function (self, trees) {
  self.label = self.label.transform(trees)
  self.body = self.body.transform(trees)
}

class ast_iteration_statement extends ast_statement_with_body {
  constructor (props) {
    super()
    this.func('ast_iteration_statement', ['blocks', 'body', 'start', 'end', 'file'], props)
  }
}
ast_iteration_statement.prototype.copy = copy_block_scope

class ast_do_loop extends ast_iteration_statement {
  constructor (props) {
    super()
    this.func('ast_do_loop', ['condition', 'blocks', 'body', 'start', 'end', 'file'], props)
  }
}

class ast_do extends ast_do_loop {
  constructor (props) {
    super()
    this.func('ast_do', ['condition', 'blocks', 'body', 'start', 'end', 'file'], props)
  }
}
ast_do.prototype.equals = return_true
ast_do.prototype.observe = function (observer) {
  return observer.observe(this, function () {
    this.body.observe(observer)
    this.condition.observe(observer)
  })
}
ast_do.prototype.branch = function (push) {
  push(this.condition)
  push(this.body)
}
ast_do.prototype.ascend = function (self, trees) {
  self.body = self.body.transform(trees)
  self.condition = self.condition.transform(trees)
}

class ast_while extends ast_do_loop {
  constructor (props) {
    super()
    this.func('ast_while', ['condition', 'blocks', 'body', 'start', 'end', 'file'], props)
  }
}
ast_while.prototype.equals = return_true
ast_while.prototype.observe = function (observer) {
  return observer.observe(this, function () {
    this.condition.observe(observer)
    this.body.observe(observer)
  })
}
ast_while.prototype.branch = function (push) {
  push(this.body)
  push(this.condition)
}
ast_while.prototype.ascend = function (self, trees) {
  self.condition = self.condition.transform(trees)
  self.body = self.body.transform(trees)
}

class ast_for extends ast_iteration_statement {
  constructor (props) {
    super()
    this.func('ast_for', ['init', 'condition', 'step', 'blocks', 'body', 'start', 'end', 'file'], props)
  }
}
ast_for.prototype.equals = function (other) {
  return (this.init == null ? other.init == null : this.init === other.init)
    && (this.condition == null ? other.condition == null : this.condition === other.condition)
    && (this.step == null ? other.step == null : this.step === other.step)
}
ast_for.prototype.observe = function (observer) {
  return observer.observe(this, function () {
    if (this.init) this.init.observe(observer)
    if (this.condition) this.condition.observe(observer)
    if (this.step) this.step.observe(observer)
    this.body.observe(observer)
  })
}
ast_for.prototype.branch = function (push) {
  push(this.body)
  if (this.step) push(this.step)
  if (this.condition) push(this.condition)
  if (this.init) push(this.init)
}
ast_for.prototype.ascend = function (self, trees) {
  if (self.init) self.init = self.init.transform(trees)
  if (self.condition) self.condition = self.condition.transform(trees)
  if (self.step) self.step = self.step.transform(trees)
  self.body = self.body.transform(trees)
}

class ast_for_in extends ast_iteration_statement {
  constructor (props) {
    super()
    this.func('ast_for_in', ['init', 'object', 'blocks', 'body', 'start', 'end', 'file'], props)
  }
}
ast_for_in.prototype.equals = return_true
ast_for_in.prototype.observe = function (observer) {
  return observer.observe(this, function () {
    this.init.observe(observer)
    this.object.observe(observer)
    this.body.observe(observer)
  })
}
ast_for_in.prototype.branch = function (push) {
  push(this.body)
  if (this.object) push(this.object)
  if (this.init) push(this.init)
}
ast_for_in.prototype.ascend = function (self, trees) {
  self.init = self.init.transform(trees)
  self.object = self.object.transform(trees)
  self.body = self.body.transform(trees)
}

class ast_for_of extends ast_for_in {
  constructor (props) {
    super()
    this.func('ast_for_of', ['is_await', 'init', 'object', 'blocks', 'body', 'start', 'end', 'file'], props)
  }
}
ast_for_of.prototype.equals = return_true

class ast_with extends ast_statement_with_body {
  constructor (props) {
    super()
    this.func('ast_with', ['expr', 'body', 'start', 'end', 'file'], props)
  }
}
ast_with.prototype.equals = return_true
ast_with.prototype.observe = function (observer) {
  return observer.observe(this, function () {
    this.expr.observe(observer)
    this.body.observe(observer)
  })
}
ast_with.prototype.branch = function (push) {
  push(this.body)
  push(this.expr)
}
ast_with.prototype.ascend = function (self, trees) {
  self.expr = self.expr.transform(trees)
  self.body = self.body.transform(trees)
}

class ast_scope extends ast_block {
  constructor (props) {
    super()
    this.func('ast_scope', ['variables', 'withs', 'eval', 'parents', 'encl', 'cname', 'body', 'blocks', 'start', 'end', 'file'], props)
  }
}
ast_scope.prototype.get_defun_scope = function () {
  let self = this
  while (self.is_block_scope()) self = self.parents
  return self
}
ast_scope.prototype.copy = function (deep, toplevel) {
  const root = this._copy(deep)
  if (deep && this.variables && toplevel && !this._block_scope) {
    root.figure_out_scope({}, {toplevel: toplevel, parents: this.parents})
  } else {
    if (this.variables) root.variables = new Map(this.variables)
    if (this.encl) root.encl = this.encl.slice()
    if (this._block_scope) root._block_scope = this._block_scope
  }
  return root
}
ast_scope.prototype.pinned = function () {
  return this.eval || this.withs
}

class ast_toplevel extends ast_scope {
  constructor (props) {
    super()
    this.func('ast_toplevel', ['globals', 'variables', 'withs', 'eval', 'parents', 'encl', 'cname', 'body', 'blocks', 'start', 'end', 'file'], props)
  }
}
ast_toplevel.prototype.equals = return_true
ast_toplevel.prototype.wrap_enclose = function () {
  const body = this.body
  return parse('(()=>{"$ORIG"})()').transform(new transforms(function (root) {
    if (root instanceof ast_directive && root.value == '$ORIG') return _splice(body)
  }))
}

class ast_lambda extends ast_scope {
  constructor (props) {
    super()
    this.func('ast_lambda', ['name', 'argnames', 'uses_args', 'gen', 'sync', 'variables', 'withs', 'eval', 'parents', 'encl', 'cname', 'body', 'blocks', 'start', 'end', 'file'], props)
  }
}
ast_lambda.prototype.equals = function (other) {
  return this.gen === other.gen && this.sync === other.sync
}
ast_lambda.prototype.args_as_names = function () {
  const out = []
  for (let i = 0, len=this.argnames.length; i < len; i++) {
    this.argnames[i] instanceof ast_destructure ? out.push(...this.argnames[i].all_symbols()) : out.push(this.argnames[i])
  }
  return out
}
ast_lambda.prototype.observe = function (observer) {
  return observer.observe(this, function () {
    if (this.name) this.name.observe(observer)
    const argnames = this.argnames
    for (let i = 0, len = argnames.length; i < len; i++) {
      argnames[i].observe(observer)
    }
    traverse(this, observer)
  })
}
ast_lambda.prototype.branch = function (push) {
  let i = this.body.length
  while (i--) push(this.body[i])
  i = this.argnames.length
  while (i--) push(this.argnames[i])
  if (this.name) push(this.name)
}
ast_lambda.prototype.is_braceless = function () {
  return this.body[0] instanceof ast_return && this.body[0].value
}
ast_lambda.prototype.length_property = function () {
  let length = 0
  for (const arg of this.argnames) {
    if (arg instanceof ast_symbol_funarg || arg instanceof ast_destructure) length++
  }
  return length
}
ast_lambda.prototype.ascend = function (self, trees) {
  if (self.name) self.name = self.name.transform(trees)
  self.argnames = tray(self.argnames, trees)
  self.body instanceof tree ? self.body = self.body.transform(trees) : self.body = tray(self.body, trees)
}

class ast_accessor extends ast_lambda {
  constructor (props) {
    super()
    this.func('ast_accessor', ['name', 'argnames', 'uses_args', 'gen', 'sync', 'variables', 'withs', 'eval', 'parents', 'encl', 'cname', 'body', 'blocks', 'start', 'end', 'file'], props)
  }
}

class ast_function extends ast_lambda {
  constructor (props) {
    super()
    this.func('ast_function', ['name', 'argnames', 'uses_args', 'gen', 'sync', 'variables', 'withs', 'eval', 'parents', 'encl', 'cname', 'body', 'blocks', 'start', 'end', 'file'], props)
  }
}

class ast_arrow extends ast_lambda {
  constructor (props) {
    super()
    this.func('ast_arrow', ['name', 'argnames', 'uses_args', 'gen', 'sync', 'variables', 'withs', 'eval', 'parents', 'encl', 'cname', 'body', 'blocks', 'start', 'end', 'file'], props)
  }
}

class ast_defun extends ast_lambda {
  constructor (props) {
    super()
    this.func('ast_defun', ['name', 'argnames', 'uses_args', 'gen', 'sync', 'variables', 'withs', 'eval', 'parents', 'encl', 'cname', 'body', 'blocks', 'start', 'end', 'file'], props)
  }
}

class ast_prefixed_template extends tree {
  constructor (props) {
    super()
    this.func('ast_prefixed_template', ['template_string', 'prefix', 'start', 'end', 'file'], props)
  }
}
ast_prefixed_template.prototype.equals = return_true
ast_prefixed_template.prototype.observe = function (observer) {
  return observer.observe(this, function () {
    this.prefix.observe(observer)
    this.template_string.observe(observer)
  })
}
ast_prefixed_template.prototype.branch = function (push) {
  push(this.template_string)
  push(this.prefix)
}
ast_prefixed_template.prototype.ascend = function (self, trees) {
  self.prefix = self.prefix.transform(trees)
  self.template_string = self.template_string.transform(trees)
}

class ast_template_string extends tree {
  constructor (props) {
    super()
    this.func('ast_template_string', ['segments', 'start', 'end', 'file'], props)
  }
}
ast_template_string.prototype.equals = return_true
ast_template_string.prototype.observe = function (observer) {
  return observer.observe(this, function () {
    this.segments.forEach(function (seg) {
      seg.observe(observer)
    })
  })
}
ast_template_string.prototype.branch = function (push) {
  let i = this.segments.length
  while (i--) push(this.segments[i])
}
ast_template_string.prototype.ascend = function (self, trees) {
  self.segments = tray(self.segments, trees)
}

class ast_template_segment extends tree {
  constructor (props) {
    super()
    this.func('ast_template_segment', ['value', 'raw', 'start', 'end', 'file'], props)
  }
}
ast_template_segment.prototype.equals = function (other) {
  return this.value === other.value
}

class ast_jump extends ast_state {
  constructor (props) {
    super()
    this.func('ast_jump', ['start', 'end', 'file'], props)
  }
}
ast_jump.prototype.equals = return_true

class ast_exit extends ast_jump {
  constructor (props) {
    super()
    this.func('ast_exit', ['value', 'start', 'end', 'file'], props)
  }
}
ast_exit.prototype.observe = function (observer) {
  return observer.observe(this, this.value && function () {
    this.value.observe(observer)
  })
}
ast_exit.prototype.branch = function (push) {
  if (this.value) push(this.value)
}
ast_exit.prototype.ascend = function (self, trees) {
  if (self.value) self.value = self.value.transform(trees)
}

class ast_return extends ast_exit {
  constructor (props) {
    super()
    this.func('ast_return', ['value', 'start', 'end', 'file'], props)
  }
}

class ast_throw extends ast_exit {
  constructor (props) {
    super()
    this.func('ast_throw', ['value', 'start', 'end', 'file'], props)
  }
}

class ast_loop_control extends ast_jump {
  constructor (props) {
    super()
    this.func('ast_loop_control', ['label', 'start', 'end', 'file'], props)
  }
}
ast_loop_control.prototype.equals = return_true
ast_loop_control.prototype.observe = function (observer) {
  return observer.observe(this, this.label && function () {
    this.label.observe(observer)
  })
}
ast_loop_control.prototype.branch = function (push) {
  if (this.label) push(this.label)
}
ast_loop_control.prototype.ascend = function (self, trees) {
  if (self.label) self.label = self.label.transform(trees)
}

class ast_break extends ast_loop_control {
  constructor (props) {
    super()
    this.func('ast_break', ['label', 'start', 'end', 'file'], props)
  }
}

class ast_continue extends ast_loop_control {
  constructor (props) {
    super()
    this.func('ast_continue', ['label', 'start', 'end', 'file'], props)
  }
}

class ast_if extends ast_statement_with_body {
  constructor (props) {
    super()
    this.func('ast_if', ['condition', 'alt', 'body', 'start', 'end', 'file'], props)
  }
}
ast_if.prototype.equals = function (other) {
  return this.alt == null ? other.alt == null : this.alt === other.alt
}
ast_if.prototype.observe = function (observer) {
  return observer.observe(this, function () {
    this.condition.observe(observer)
    this.body.observe(observer)
    if (this.alt) this.alt.observe(observer)
  })
}
ast_if.prototype.branch = function (push) {
  if (this.alt) push(this.alt)
  push(this.body)
  push(this.condition)
}
ast_if.prototype.ascend = function (self, trees) {
  self.condition = self.condition.transform(trees)
  self.body = self.body.transform(trees)
  if (self.alt) self.alt = self.alt.transform(trees)
}

class ast_switch extends ast_block {
  constructor (props) {
    super()
    this.func('ast_switch', ['expr', 'body', 'blocks', 'start', 'end', 'file'], props)
  }
}
ast_switch.prototype.equals = return_true
ast_switch.prototype.observe = function (observer) {
  return observer.observe(this, function () {
    this.expr.observe(observer)
    traverse(this, observer)
  })
}
ast_switch.prototype.branch = function (push) {
  let i = this.body.length
  while (i--) push(this.body[i])
  push(this.expr)
}
ast_switch.prototype.ascend = function (self, trees) {
  self.expr = self.expr.transform(trees)
  self.body = tray(self.body, trees)
}

class ast_switch_branch extends ast_block {
  constructor (props) {
    super()
    this.func('ast_switch_branch', ['body', 'blocks', 'start', 'end', 'file'], props)
  }
}
ast_switch_branch.prototype.equals = return_true

class ast_default extends ast_switch_branch {
  constructor (props) {
    super()
    this.func('ast_default', ['body', 'blocks', 'start', 'end', 'file'], props)
  }
}

class ast_case extends ast_switch_branch {
  constructor (props) {
    super()
    this.func('ast_case', ['expr', 'body', 'blocks', 'start', 'end', 'file'], props)
  }
}
ast_case.prototype.observe = function (observer) {
  return observer.observe(this, function () {
    this.expr.observe(observer)
    traverse(this, observer)
  })
}
ast_case.prototype.branch = function (push) {
  let i = this.body.length
  while (i--) push(this.body[i])
  push(this.expr)
}
ast_case.prototype.ascend = function (self, trees) {
  self.expr = self.expr.transform(trees)
  self.body = tray(self.body, trees)
}

class ast_try extends tree {
  constructor (props) {
    super()
    this.func('ast_try', ['body', 'bcatch', 'bfinally', 'start', 'end', 'file'], props)
  }
}
ast_try.prototype.equals = function (other) {
  return (this.body === other.body) && (this.bcatch == null ? other.bcatch == null : this.bcatch === other.bcatch) && (this.bfinally == null ? other.bfinally == null : this.bfinally === other.bfinally)
}
ast_try.prototype.observe = function (observer) {
  return observer.observe(this, function () {
    this.body.observe(observer)
    if (this.bcatch) this.bcatch.observe(observer)
    if (this.bfinally) this.bfinally.observe(observer)
  })
}
ast_try.prototype.branch = function (push) {
  if (this.bfinally) push(this.bfinally)
  if (this.bcatch) push(this.bcatch)
  push(this.body)
}
ast_try.prototype.ascend = function (self, trees) {
  self.body = self.body.transform(trees)
  if (self.bcatch) self.bcatch = self.bcatch.transform(trees)
  if (self.bfinally) self.bfinally = self.bfinally.transform(trees)
}

class ast_try_block extends ast_block {
  constructor (props) {
    super()
    this.func('ast_try_block', ['body', 'blocks', 'start', 'end', 'file'], props)
  }
}

class ast_catch extends tree {
  constructor (props) {
    super()
    this.func('ast_catch', ['argname', 'body', 'blocks', 'start', 'end', 'file'], props)
  }
}
ast_catch.prototype.equals = function (other) {
  return this.argname == null ? other.argname == null : this.argname === other.argname
}
ast_catch.prototype.observe = function (observer) {
  return observer.observe(this, function () {
    if (this.argname) this.argname.observe(observer)
    traverse(this, observer)
  })
}
ast_catch.prototype.branch = function (push) {
  let i = this.body.length
  while (i--) push(this.body[i])
  if (this.argname) push(this.argname)
}
ast_catch.prototype.ascend = function (self, trees) {
  if (self.argname) self.argname = self.argname.transform(trees)
  self.body = tray(self.body, trees)
}

class ast_finally extends tree {
  constructor (props) {
    super()
    this.func('ast_finally', ['body', 'blocks', 'start', 'end', 'file'], props)
  }
}
ast_finally.prototype.equals = return_true

class ast_definitions extends tree {
  constructor (props) {
    super()
    this.func('ast_definitions', ['defs', 'start', 'end', 'file'], props)
  }
}
ast_definitions.prototype.equals = return_true
ast_definitions.prototype.observe = function (observer) {
  return observer.observe(this, function () {
    const defs = this.defs
    for (let i = 0, len = defs.length; i < len; i++) {
      defs[i].observe(observer)
    }
  })
}
ast_definitions.prototype.branch = function (push) {
  let i = this.defs.length
  while (i--) push(this.defs[i])
}
ast_definitions.prototype.ascend = function (self, trees) {
  self.defs = tray(self.defs, trees)
}

class ast_var extends ast_definitions {
  constructor (props) {
    super()
    this.func('ast_var', ['defs', 'start', 'end', 'file'], props)
  }
}

class ast_let extends ast_definitions {
  constructor (props) {
    super()
    this.func('ast_let', ['defs', 'start', 'end', 'file'], props)
  }
}

class ast_const extends ast_definitions {
  constructor (props) {
    super()
    this.func('ast_const', ['defs', 'start', 'end', 'file'], props)
  }
}

class ast_var_def extends tree {
  constructor (props) {
    super()
    this.func('ast_var_def', ['name', 'value', 'start', 'end', 'file'], props)
  }
}
ast_var_def.prototype.equals = function (other) {
  return this.value == null ? other.value == null : this.value === other.value
}
ast_var_def.prototype.observe = function (observer) {
  return observer.observe(this, function () {
    this.name.observe(observer)
    if (this.value) this.value.observe(observer)
  })
}
ast_var_def.prototype.branch = function (push) {
  if (this.value) push(this.value)
  push(this.name)
}
ast_var_def.prototype.declarations_as_names = function () {
  return this.name instanceof ast_declaration ? [this] : this.name.all_symbols()
}
ast_var_def.prototype.ascend = function (self, trees) {
  self.name = self.name.transform(trees)
  if (self.value) self.value = self.value.transform(trees)
}

class ast_name_mapping extends tree {
  constructor (props) {
    super()
    this.func('ast_name_mapping', ['foreign_name', 'name', 'start', 'end', 'file'], props)
  }
}
ast_name_mapping.prototype.equals = return_true
ast_name_mapping.prototype.observe = function (observer) {
  return observer.observe(this, function () {
    this.foreign_name.observe(observer)
    this.name.observe(observer)
  })
}
ast_name_mapping.prototype.branch = function (push) {
  push(this.name)
  push(this.foreign_name)
}
ast_name_mapping.prototype.ascend = function (self, trees) {
  self.foreign_name = self.foreign_name.transform(trees)
  self.name = self.name.transform(trees)
}

class ast_import extends tree {
  constructor (props) {
    super()
    this.func('ast_import', ['import_name', 'import_names', 'module_name', 'assert_clause', 'start', 'end', 'file'], props)
  }
}
ast_import.prototype.equals = function (other) {
  return (this.import_name == null ? other.import_name == null : this.import_name === other.import_name)
    && (this.import_names == null ? other.import_names == null : this.import_names === other.import_names)
}
ast_import.prototype.observe = function (observer) {
  return observer.observe(this, function () {
    if (this.import_name) this.import_name.observe(observer)
    if (this.import_names) {
      this.import_names.forEach(function (name_import) {
        name_import.observe(observer)
      })
    }
    this.module_name.observe(observer)
  })
}
ast_import.prototype.branch = function (push) {
  push(this.module_name)
  if (this.import_names) {
    let i = this.import_names.length
    while (i--) push(this.import_names[i])
  }
  if (this.import_name) push(this.import_name)
}
ast_import.prototype.ascend = function (self, trees) {
  if (self.import_name) self.import_name = self.import_name.transform(trees)
  if (self.import_names) tray(self.import_names, trees)
  self.module_name = self.module_name.transform(trees)
}

class ast_export extends tree {
  constructor (props) {
    super()
    this.func('ast_export', ['defined', 'value', 'is_default', 'names', 'module_name', 'assert_clause', 'start', 'end', 'file'], props)
  }
}
ast_export.prototype.equals = function (other) {
  return (this.defined == null ? other.defined == null : this.defined === other.defined) && (this.value == null ? other.value == null : this.value === other.value) && (this.names == null ? other.names == null : this.names === other.names) && this.module_name === other.module_name && this.is_default === other.is_default
}
ast_export.prototype.observe = function (observer) {
  return observer.observe(this, function () {
    if (this.defined) this.defined.observe(observer)
    if (this.value) this.value.observe(observer)
    if (this.names) {
      this.names.forEach(function (name_export) {
        name_export.observe(observer)
      })
    }
    if (this.module_name) this.module_name.observe(observer)
  })
}
ast_export.prototype.branch = function (push) {
  if (this.module_name) push(this.module_name)
  if (this.names) {
    let i = this.names.length
    while (i--) push(this.names[i])
  }
  if (this.value) push(this.value)
  if (this.defined) push(this.defined)
}
ast_export.prototype.ascend = function (self, trees) {
  if (self.defined) self.defined = self.defined.transform(trees)
  if (self.value) self.value = self.value.transform(trees)
  if (self.names) tray(self.names, trees)
  if (self.module_name) self.module_name = self.module_name.transform(trees)
}

class ast_sequence extends tree {
  constructor (props) {
    super()
    this.func('ast_sequence', ['expressions', 'start', 'end', 'file'], props)
  }
}
ast_sequence.prototype.equals = return_true
ast_sequence.prototype.observe = function (observer) {
  return observer.observe(this, function () {
    this.expressions.forEach(function (root) {
      root.observe(observer)
    })
  })
}
ast_sequence.prototype.branch = function (push) {
  let i = this.expressions.length
  while (i--) push(this.expressions[i])
}
ast_sequence.prototype.ascend = function (self, trees) {
  const result = tray(self.expressions, trees)
  self.expressions = result.length ? result: [new ast_number({value: 0})]
}

class ast_prop_access extends tree {
  constructor (props) {
    super()
    this.func('ast_prop_access', ['expr', 'property', 'optional', 'start', 'end', 'file'], props)
  }
}
ast_prop_access.prototype.observe = function (observer) {
  return observer.observe(this, function () {
    this.expressions.forEach(function (root) {
      root.observe(observer)
    })
  })
}
ast_prop_access.prototype.branch = function (push) {
  let i = this.expressions.length
  while (i--) push(this.expressions[i])
}
ast_prop_access.prototype.ascend = function (self, trees) {
  self.expr = self.expr.transform(trees)
}

class ast_dot extends ast_prop_access {
  constructor (props) {
    super()
    this.func('ast_dot', ['quote', 'expr', 'property', 'optional', 'anno', 'start', 'end', 'file'], props)
  }
}
ast_dot.prototype.equals = function (other) {
  return this.property == other.property
}
ast_dot.prototype.observe = function (observer) {
  return observer.observe(this, function () {
    this.expr.observe(observer)
  })
}
ast_dot.prototype.branch = function (push) {
  push(this.expr)
}

class ast_dot_hash extends ast_prop_access {
  constructor (props) {
    super()
    this.func('ast_dot_hash', ['expr', 'property', 'optional', 'start', 'end', 'file'], props)
  }
}
ast_dot_hash.prototype.equals = function (other) {
  return this.property == other.property
}
ast_dot_hash.prototype.observe = function (observer) {
  return observer.observe(this, function () {
    this.expr.observe(observer)
  })
}
ast_dot_hash.prototype.branch = function (push) {
  push(this.expr)
}

class ast_sub extends ast_prop_access {
  constructor (props) {
    super()
    this.func('ast_sub', ['expr', 'property', 'optional', 'anno', 'start', 'end', 'file'], props)
  }
}
ast_sub.prototype.equals = return_true
ast_sub.prototype.observe = function (observer) {
  return observer.observe(this, function () {
    this.expr.observe(observer)
    this.property.observe(observer)
  })
}
ast_sub.prototype.branch = function (push) {
  push(this.property)
  push(this.expr)
}
ast_sub.prototype.ascend = function (self, trees) {
  self.expr = self.expr.transform(trees)
  self.property = self.property.transform(trees)
}

class ast_object extends tree {
  constructor (props) {
    super()
    this.func('ast_object', ['properties', 'start', 'end', 'file'], props)
  }
}
ast_object.prototype.equals = return_true
ast_object.prototype.observe = function (observer) {
  return observer.observe(this, function () {
    const properties = this.properties
    for (let i = 0, len = properties.length; i < len; i++) {
      properties[i].observe(observer)
    }
  })
}
ast_object.prototype.branch = function (push) {
  let i = this.properties.length
  while (i--) push(this.properties[i])
}
ast_object.prototype.ascend = function (self, trees) {
  self.properties = tray(self.properties, trees)
}

class ast_object_property extends tree {
  constructor (props) {
    super()
    this.func('ast_object_property', ['key', 'value', 'anno', 'start', 'end', 'file'], props)
  }
}
ast_object_property.prototype.equals = return_true
ast_object_property.prototype.observe = function (observer) {
  return observer.observe(this, function () {
    if (this.key instanceof tree) this.key.observe(observer)
    this.value.observe(observer)
  })
}
ast_object_property.prototype.branch = function (push) {
  push(this.value)
  if (this.key instanceof tree) push(this.key)
}
ast_object_property.prototype.ascend = function (self, trees) {
  if (self.key instanceof tree) self.key = self.key.transform(trees)
  if (self.value) self.value = self.value.transform(trees)
}

class ast_key_value extends ast_object_property {
  constructor (props) {
    super()
    this.func('ast_key_value', ['key', 'value', 'anno', 'start', 'end', 'file'], props)
  }
}
ast_key_value.prototype.equals = function (other) {
  return this.key === other.key
}
ast_key_value.prototype.computed_key = function () {
  return this.key instanceof tree
}

class ast_private_setter extends ast_object_property {
  constructor (props) {
    super()
    this.func('ast_private_setter', ['static', 'key', 'value', 'start', 'end', 'file'], props)
  }
}
ast_private_setter.prototype.computed_key = () => false

class ast_private_getter extends ast_object_property {
  constructor (props) {
    super()
    this.func('ast_private_getter', ['static', 'key', 'value', 'start', 'end', 'file'], props)
  }
}
ast_private_getter.prototype.computed_key = () => false

class ast_object_setter extends ast_object_property {
  constructor (props) {
    super()
    this.func('ast_object_setter', ['quote', 'static', 'key', 'value', 'anno', 'start', 'end', 'file'], props)
  }
}
ast_object_setter.prototype.equals = function (other) {
  return this.static === other.static
}
ast_object_setter.prototype.computed_key = function () {
  return !(this.key instanceof ast_symbol_method)
}

class ast_object_getter extends ast_object_property {
  constructor (props) {
    super()
    this.func('ast_object_getter', ['quote', 'static', 'key', 'value', 'anno', 'start', 'end', 'file'], props)
  }
}
ast_object_getter.prototype.equals = function (other) {
  return this.static === other.static
}
ast_object_getter.prototype.computed_key = function () {
  return !(this.key instanceof ast_symbol_method)
}

class ast_concise_method extends ast_object_property {
  constructor (props) {
    super()
    this.func('ast_concise_method', ['quote', 'static', 'gen', 'sync', 'key', 'value', 'anno', 'start', 'end', 'file'], props)
  }
}
ast_concise_method.prototype.equals = function (other) {
  return this.static === other.static && this.gen === other.gen && this.sync === other.sync
}
ast_concise_method.prototype.computed_key = function () {
  return !(this.key instanceof ast_symbol_method)
}

class ast_private_method extends ast_concise_method {
  constructor (props) {
    super()
    this.func('ast_concise_method', ['quote', 'static', 'gen', 'sync', 'key', 'value', 'start', 'end', 'file'], props)
  }
}

class ast_class extends ast_scope {
  constructor (props) {
    super()
    this.func('ast_class', ['name', 'extends', 'properties', 'variables', 'withs', 'eval', 'parents', 'encl', 'cname', 'body', 'blocks', 'start', 'end', 'file'], props)
  }
}
ast_class.prototype.equals = function (other) {
  return (this.name == null ? other.name == null : this.name === other.name) && (this.extends == null ? other.extends == null : this.extends === other.extends)
}
ast_class.prototype.observe = function (observer) {
  return observer.observe(this, function () {
    if (this.name) this.name.observe(observer)
    if (this.extends) this.extends.observe(observer)
    this.properties.forEach((prop) => prop.observe(observer))
  })
}
ast_class.prototype.branch = function (push) {
  let i = this.properties.length
  while (i--) push(this.properties[i])
  if (this.extends) push(this.extends)
  if (this.name) push(this.name)
}
ast_class.prototype.visit_nondeferred_class_parts = function (observer) {
  if (this.extends) this.extends.observe(observer)
  this.properties.forEach((prop) => {
    if (prop instanceof ast_class_static) {
      prop.observe(observer)
      return
    }
    if (prop.computed_key()) {
      observer.push(prop)
      prop.key.observe(observer)
      observer.pop()
    }
    if ((prop instanceof ast_private_property || prop instanceof ast_class_property) && prop.static && prop.value) {
      observer.push(prop)
      prop.value.observe(observer)
      observer.pop()
    }
  })
}
ast_class.prototype.visit_deferred_class_parts = function (observer) {
  this.properties.forEach((prop) => {
    if (prop instanceof ast_concise_method) {
      prop.observe(observer)
    } else if (prop instanceof ast_class_property && !prop.static && prop.value) {
      observer.push(prop)
      prop.value.observe(observer)
      observer.pop()
    }
  })
}
ast_class.prototype.is_self_referential = function () {
  const this_id = this.name && this.name.defined().id
  let found = false, class_this = true, class_this_save
  this.visit_nondeferred_class_parts(new observes((root, ascend) => {
    if (found) return true
    if (root instanceof ast_this) return (found = class_this)
    if (root instanceof ast_symbol_ref) return (found = root.defined().id === this_id)
    if (root instanceof ast_lambda && !(root instanceof ast_arrow)) {
      class_this_save = class_this
      class_this = false
      ascend()
      class_this = class_this_save
      return true
    }
  }))
  return found
}
ast_class.prototype.ascend = function (self, trees) {
  if (self.name) self.name = self.name.transform(trees)
  if (self.extends) self.extends = self.extends.transform(trees)
  self.properties = tray(self.properties, trees)
}

class ast_class_property extends ast_object_property {
  constructor (props) {
    super()
    this.func('ast_class_property', ['quote', 'static', 'key', 'value', 'anno', 'start', 'end', 'file'], props)
  }
}
ast_class_property.prototype.equals = function (other) {
  return this.static === other.static
}
ast_class_property.prototype.observe = function (observer) {
  return observer.observe(this, function () {
    if (this.key instanceof tree) this.key.observe(observer)
    if (this.value instanceof tree) this.value.observe(observer)
  })
}
ast_class_property.prototype.branch = function (push) {
  if (this.value instanceof tree) push(this.value)
  if (this.key instanceof tree) push(this.key)
}
ast_class_property.prototype.computed_key = function () {
  return !(this.key instanceof ast_symbol_class_property)
}

class ast_private_property extends ast_class_property {
  constructor (props) {
    super()
    this.func('ast_private_property', ['quote', 'static', 'key', 'value', 'start', 'end', 'file'], props)
  }
}

class ast_private_in extends tree {
  constructor (props) {
    super()
    this.func('ast_private_in', ['key', 'value', 'start', 'end', 'file'], props)
  }
}
ast_private_in.prototype.observe = function (observer) {
  return observer.observe(this, function () {
    this.key.observe(observer)
    this.value.observe(observer)
  })
}
ast_private_in.prototype.branch = function (push) {
  push(this.value)
  push(this.key)
}
ast_private_in.prototype.ascend = function (self, trees) {
  self.key = self.key.transform(trees)
  self.value = self.value.transform(trees)
}

class ast_def_class extends ast_class {
  constructor (props) {
    super()
    this.func('ast_def_class', ['name', 'extends', 'properties', 'variables', 'withs', 'eval', 'parents', 'encl', 'cname', 'body', 'blocks', 'start', 'end', 'file'], props)
  }
}

class ast_class_static extends ast_scope {
  constructor (props) {
    super()
    this.func('ast_class_static', ['body', 'start', 'end', 'file'], props)
  }
}
ast_class_static.prototype.observe = function (observer) {
  return observer.observe(this, function () {
    traverse(this, observer)
  })
}
ast_class_static.prototype.branch = function (push) {
  let i = this.body.length
  while (i--) push(this.body[i])
}
ast_class_static.prototype.copy = copy_block_scope
ast_class_static.prototype.computed_key = () => false
ast_class_static.prototype.ascend = function (self, trees) {
  return self.body = tray(self.body, trees)
}

class ast_class_expression extends ast_class {
  constructor (props) {
    super()
    this.func('ast_class_expression', ['name', 'extends', 'properties', 'variables', 'withs', 'eval', 'parents', 'encl', 'cname', 'body', 'blocks', 'start', 'end', 'file'], props)
  }
}

class ast_symbol extends tree {
  constructor (props) {
    super()
    this.func('ast_symbol', ['scope', 'name', 'thedef', 'start', 'end', 'file'], props)
  }
}
ast_symbol.prototype.equals = function (other) {
  return this.name === other.name
}

class ast_new_target extends tree {
  constructor (props) {
    super()
    this.func('ast_new_target', ['start', 'end', 'file'], props)
  }
}
ast_new_target.prototype.equals = return_true

class ast_declaration extends ast_symbol {
  constructor (props) {
    super()
    this.func('ast_declaration', ['init', 'scope', 'name', 'thedef', 'start', 'end', 'file'], props)
  }
}

class ast_symbol_var extends ast_declaration {
  constructor (props) {
    super()
    this.func('ast_symbol_var', ['init', 'scope', 'name', 'thedef', 'start', 'end', 'file'], props)
  }
}

class ast_symbol_block extends ast_declaration {
  constructor (props) {
    super()
    this.func('ast_symbol_block', ['init', 'scope', 'name', 'thedef', 'start', 'end', 'file'], props)
  }
}

class ast_symbol_const extends ast_symbol_block {
  constructor (props) {
    super()
    this.func('ast_symbol_const', ['init', 'scope', 'name', 'thedef', 'start', 'end', 'file'], props)
  }
}

class ast_symbol_let extends ast_symbol_block {
  constructor (props) {
    super()
    this.func('ast_symbol_let', ['init', 'scope', 'name', 'thedef', 'start', 'end', 'file'], props)
  }
}

class ast_symbol_funarg extends ast_symbol_var {
  constructor (props) {
    super()
    this.func('ast_symbol_funarg', ['init', 'scope', 'name', 'thedef', 'start', 'end', 'file'], props)
  }
}

class ast_symbol_defun extends ast_declaration {
  constructor (props) {
    super()
    this.func('ast_symbol_defun', ['init', 'scope', 'name', 'thedef', 'start', 'end', 'file'], props)
  }
}

class ast_symbol_method extends ast_symbol {
  constructor (props) {
    super()
    this.func('ast_symbol_method', ['scope', 'name', 'thedef', 'start', 'end', 'file'], props)
  }
}

class ast_symbol_class_property extends ast_symbol {
  constructor (props) {
    super()
    this.func('ast_symbol_class_property', ['scope', 'name', 'thedef', 'start', 'end', 'file'], props)
  }
}

class ast_symbol_lambda extends ast_declaration {
  constructor (props) {
    super()
    this.func('ast_symbol_lambda', ['init', 'scope', 'name', 'thedef', 'start', 'end', 'file'], props)
  }
}

class ast_symbol_def_class extends ast_symbol_block {
  constructor (props) {
    super()
    this.func('ast_symbol_def_class', ['init', 'scope', 'name', 'thedef', 'start', 'end', 'file'], props)
  }
}

class ast_symbol_class extends ast_declaration {
  constructor (props) {
    super()
    this.func('ast_symbol_class', ['init', 'scope', 'name', 'thedef', 'start', 'end', 'file'], props)
  }
}

class ast_symbol_catch extends ast_symbol_block {
  constructor (props) {
    super()
    this.func('ast_symbol_catch', ['init', 'scope', 'name', 'thedef', 'start', 'end', 'file'], props)
  }
}

class ast_symbol_import extends ast_symbol_block {
  constructor (props) {
    super()
    this.func('ast_symbol_import', ['init', 'scope', 'name', 'thedef', 'start', 'end', 'file'], props)
  }
}

class ast_symbol_import_foreign extends ast_symbol {
  constructor (props) {
    super()
    this.func('ast_symbol_import_foreign', ['scope', 'name', 'thedef', 'quote', 'start', 'end', 'file'], props)
  }
}

class ast_label extends ast_symbol {
  constructor (props) {
    super()
    this.func('ast_label', ['references', 'scope', 'name', 'thedef', 'start', 'end', 'file'], props)
  }
}
ast_label.prototype.initialize = function () {
  this.references = []
  this.thedef = this
}

class ast_symbol_ref extends ast_symbol {
  constructor (props) {
    super()
    this.func('ast_symbol_ref', ['scope', 'name', 'thedef', 'start', 'end', 'file'], props)
  }
}

class ast_symbol_export extends ast_symbol_ref {
  constructor (props) {
    super()
    this.func('ast_symbol_export', ['scope', 'name', 'thedef', 'quote', 'start', 'end', 'file'], props)
  }
}

class ast_symbol_export_foreign extends ast_symbol {
  constructor (props) {
    super()
    this.func('ast_symbol_export_foreign', ['scope', 'name', 'thedef', 'quote', 'start', 'end', 'file'], props)
  }
}

class ast_label_ref extends ast_symbol {
  constructor (props) {
    super()
    this.func('ast_label_ref', ['scope', 'name', 'thedef', 'start', 'end', 'file'], props)
  }
}

class ast_symbol_private_property extends ast_symbol {
  constructor (props) {
    super()
    this.func('ast_symbol_private_property', ['scope', 'name', 'thedef', 'start', 'end', 'file'], props)
  }
}

class ast_this extends ast_symbol {
  constructor (props) {
    super()
    this.func('ast_this', ['scope', 'name', 'thedef', 'start', 'end', 'file'], props)
  }
}
ast_this.prototype.equals = return_true

class ast_super extends ast_this {
  constructor (props) {
    super()
    this.func('ast_super', ['scope', 'name', 'thedef', 'start', 'end', 'file'], props)
  }
}
ast_super.prototype.equals = return_true

function node_size (root, func) { root.prototype.size = func }

node_size(tree, function (compressor, stack) {
  let size = 0
  walk_parent(this, (root, info) => {
    size += root._size(info)
    if (root instanceof ast_arrow && root.is_braceless()) {
      size += root.body[0].value._size(info)
      return true
    }
  }, stack || (compressor && compressor.stack))
  return size
})

tree.prototype._size = () => 0
ast_directive.prototype._size = () => 2 + this.value.length
ast_block.prototype._size = () => 2 + list_overhead(this.body)
ast_empty_statement.prototype._size = () => 1
ast_labeled_statement.prototype._size = () => 2
ast_do.prototype._size = () => 9
ast_while.prototype._size = () => 7
ast_for.prototype._size = () => 8
ast_for_in.prototype._size = () => 8
ast_with.prototype._size = () => 6
ast_toplevel.prototype._size = () => list_overhead(this.body)
ast_spread.prototype._size = () => 3
ast_debugger.prototype._size = () => 8
ast_accessor.prototype._size = function () {
  4 + lambda_modifiers(this) + list_overhead(this.argnames) + list_overhead(this.body)
}
ast_function.prototype._size = function (info) {
  12 + (!!first_in_statement(info) * 2) + lambda_modifiers(this) + list_overhead(this.argnames) + list_overhead(this.body)
}
ast_arrow.prototype._size = function () {
  let args_and_arrow = 2 + list_overhead(this.argnames)
  if (!(this.argnames.length === 1 && this.argnames[0] instanceof ast_symbol)) args_and_arrow += 2
  return lambda_modifiers(this) + args_and_arrow + (this.is_braceless() ? 0: list_overhead(this.body) + 2)
}
ast_defun.prototype._size = function () {
  13 + lambda_modifiers(this) + list_overhead(this.argnames) + list_overhead(this.body)
}
ast_destructure.prototype._size = () => 2
ast_template_string.prototype._size = () => 2 + (Math.floor(this.segments.length / 2) * 3)
ast_template_segment.prototype._size = () => this.value.length
ast_return.prototype._size = function () { return this.value ? 7: 6 }
ast_return.prototype._size = () => 6
ast_break.prototype._size = function () { return this.label ? 6 : 5 }
ast_continue.prototype._size = function () { return this.label ? 9 : 8 }
ast_await.prototype._size = () => 6
ast_yield.prototype._size = () => 6
ast_if.prototype._size = () => 4
ast_switch.prototype._size = function () { return 8 + list_overhead(this.body) }
ast_default.prototype._size = function () { return 8 + list_overhead(this.body) }
ast_case.prototype._size = function () { return 5 + list_overhead(this.body) }
ast_try.prototype._size = () => 3
ast_catch.prototype._size = function () { return 7 + list_overhead(this.body) + (this.argname ? 2 : 0) }
ast_finally.prototype._size = function () { return 7 + list_overhead(this.body) }
ast_var.prototype._size = function () { return 4 + list_overhead(this.defs) }
ast_let.prototype._size = function () { return 4 + list_overhead(this.defs) }
ast_const.prototype._size = function () { return 6 + list_overhead(this.defs) }
ast_var_def.prototype._size = function () { return this.value ? 1 : 0 }
ast_name_mapping.prototype._size = function () { return this.name ? 4: 0 }
ast_import.prototype._size = function () {
  let size = 6
  if (this.import_name) size += 1
  if (this.import_name || this.import_names) size += 5
  if (this.import_names) size += 2 + list_overhead(this.import_names)
  return size
}
ast_export.prototype._size = function () {
  let size = 7 + (this.is_default ? 8: 0)
  if (this.value) size += this.value._size()
  if (this.names) size += 2 + list_overhead(this.names)
  if (this.module_name) size += 5
  return size
}
ast_call.prototype._size = function () { return this.optional ? 4 + list_overhead(this.args): 2 + list_overhead(this.args) }
ast_new.prototype._size = function () { return 6 + list_overhead(this.args) }
ast_sequence.prototype._size = function () { return list_overhead(this.expressions) }
ast_dot.prototype._size = function () { return this.property.length + this.optional ? 2 : 1 }
ast_dot_hash.prototype._size = function () { return this.property.length + this.optional ? 3: 2 }
ast_sub.prototype._size = function () { return this.optional ? 4: 2 }
ast_unary.prototype._size = function () {
  if (this.operator == 'typeof') return 7
  if (this.operator == 'void') return 5
  return this.operator.length
}
ast_binary.prototype._size = function (info) {
  if (this.operator == 'in') return 4
  let size = this.operator.length
  if ((this.operator == '+' || this.operator == '-') && this.right instanceof ast_unary && this.right.operator === this.operator) size += 1
  if (this.needs_parens(info)) size += 2
  return size
}
ast_conditional.prototype._size = () => 3
ast_array.prototype._size = function () { return 2 + list_overhead(this.elements) }
ast_object.prototype._size = function (info) { return 2 + list_overhead(this.properties) + first_in_statement(info) ? 2 : 0 }
ast_key_value.prototype._size = function () { return key_size(this.key) + 1 }
ast_private_getter.prototype._size = function () { return static_size(this.static) + key_size(this.key) + lambda_modifiers(this) + 4 }
ast_object_setter.prototype._size = function () { return 5 + static_size(this.static) + key_size(this.key) }
ast_object_getter.prototype._size = function () { return 5 + static_size(this.static) + key_size(this.key) }
ast_concise_method.prototype._size = function () { return static_size(this.static) + key_size(this.key) + lambda_modifiers(this) }
ast_private_method.prototype._size = function () { return static_size(this.static) + key_size(this.key) + lambda_modifiers(this) + 1 }
ast_class.prototype._size = function () { return (this.name ? 8 : 7) + (this.extends ? 8 : 0) }
ast_class_property.prototype._size = function () {
  return static_size(this.static) + (typeof this.key == 'string' ? this.key.length + 2 : 0) + (this.value ? 1 : 0)
}
ast_private_property.prototype._size = function () {
  return static_size(this.static) + (typeof this.key == 'string' ? this.key.length + 2 : 0) + (this.value ? 1 : 0) + 1
}
ast_private_in.prototype._size = () => 5
ast_class_static.prototype._size = function () { return 8 + list_overhead(this.body)}
ast_symbol.prototype._size = () => 1
ast_new_target.prototype._size = () => 10
ast_declaration.prototype._size = function () { return this.name == 'arguments' ? 9 : 1 }
ast_symbol_class_property.prototype._size = function () { return this.name.length }
ast_symbol_import_foreign.prototype._size = function () { return this.name.length }
ast_symbol_ref.prototype._size = function () { return this.name == 'arguments' ? 9 : 1 }
ast_symbol_export_foreign.prototype._size = function () { return this.name.length }
ast_this.prototype._size = () => 4
ast_super.prototype._size = () => 5
ast_string.prototype._size = function () { return this.value.length + 2 }
ast_number.prototype._size = function () {
  const value = this.value
  if (this === 0) return 1
  if (value > 0 && Math.floor(value) === value) return Math.floor(Math.log10(value) + 1)
  return value.toString().length
}
ast_big_int.prototype._size = function () { return this.value.length }
ast_reg_exp.prototype._size = function () { return this.value.toString().length }
ast_null.prototype._size = () => 4
ast_nan.prototype._size = () => 3
ast_undefined.prototype._size = () => 6
ast_hole.prototype._size = () => 0
ast_infinity.prototype._size = () => 8
ast_false.prototype._size = () => 5
ast_true.prototype._size = () => 4

const dont_mangle = 1, want_mangle = 2

let block_scopes = null

function redefined_catch_def (root) {
  if (root.orig[0] instanceof ast_symbol_catch && root.scope.is_block_scope()) {
    return root.scope.get_defun_scope().variables.get(root.file + '/' + root.name)
  }
}

class symbol_def {
  constructor (scope, orig, init) {
    this.name = orig.name
    this.file = orig.file
    this.orig = [ orig ]
    this.init = init
    this.eliminated = 0
    this.assignments = 0
    this.scope = scope
    this.replaced = 0
    this.global = false
    this.export = 0
    this.mangled_name = null
    this.undeclared = false
    this.id = symbol_def.next_id++
    this.chained = false
    this.direct_access = false
    this.escaped = 0
    this.recursive_refs = 0
    this.references = []
    this.should_replace = undefined
    this.single_use = false
    this.fixed = false
  }
  fixed_value() {
    if (!this.fixed || this.fixed instanceof tree) return this.fixed
    return this.fixed()
  }
  unmangleable(options) {
    if (!options) options = {}
    return this.global && !options.toplevel
      || this.undeclared
      || !options.eval && this.scope.pinned()
      || this.orig[0] instanceof ast_symbol_method
  }
  mangle(options) {
    const cache = options.cache && options.cache.props
    if (this.global && cache && cache.has(this.name)) {
      this.mangled_name = cache.get(this.name)
    } else if (!this.mangled_name && !this.unmangleable(options)) {
      const redefinition = redefined_catch_def(this)
      this.mangled_name = redefinition ? redefinition.mangled_name || redefinition.name : this.scope.next_mangled(options, this)
      if (this.global && cache) cache.set(this.name, this.mangled_name)
    } else if (this.global && cache) {
      cache.set(this.name, this.mangled_name)
    }
  }
  static next_id = 1
}

ast_scope.prototype.figure_out_scope = function (options, {parents = null, toplevel = this} = {}) {
  options = defaults(options, {'cache': null, 'module': false})
  if (!(toplevel instanceof ast_toplevel)) throw new Error('bad toplevel scope')
  let scope = this.parents = parents, labels = new Map(), defun = null, in_destructure = null
  let trees = new observes((root, ascend) => {
    if (root.is_block_scope()) {
      const save_scope = scope
      root.blocks = scope = new ast_scope(root)
      scope._block_scope = true
      scope.init_scope_vars(save_scope)
      scope.withs = save_scope.withs
      scope.eval = save_scope.eval
      if (root instanceof ast_switch) {
        const the_block_scope = scope
        scope = save_scope
        root.expr.observe(trees)
        scope = the_block_scope
        for (let i = 0; i < root.body.length; i++) {
          root.body[i].observe(trees)
        }
      } else {
        ascend()
      }
      scope = save_scope
      return true
    }
    if (root instanceof ast_destructure) {
      const save_destructure = in_destructure
      in_destructure = root
      ascend()
      in_destructure = save_destructure
      return true
    }
    if (root instanceof ast_scope) {
      root.init_scope_vars(scope)
      let save_scope = scope, save_defun = defun, save_labels = labels
      defun = scope = root
      labels = new Map()
      ascend()
      scope = save_scope
      defun = save_defun
      labels = save_labels
      return true
    }
    if (root instanceof ast_labeled_statement) {
      const l = root.label
      if (labels.has(l.name)) throw new Error('duplciate label' + l)
      labels.set(l.name, l)
      ascend()
      labels.delete(l.name)
      return true
    }
    if (root instanceof ast_with) {
      for (let s = scope; s; s = s.parents) s.withs = true
      return
    }
    if (root instanceof ast_symbol) root.scope = scope
    if (root instanceof ast_label) {
      root.thedef = root
      root.references = []
    }
    if (root instanceof ast_symbol_lambda) {
      defun.def_function(root, root.name == 'arguments' ? undefined : defun)
    } else if (root instanceof ast_symbol_defun) {
      const closest_scope = defun.parents
      root.scope = closest_scope.get_defun_scope()
      mark_export(root.scope.def_function(root, defun), 1)
    } else if (root instanceof ast_symbol_class) {
      mark_export(defun.def_variable(root, defun), 1)
    } else if (root instanceof ast_symbol_import) {
      scope.def_variable(root)
    } else if (root instanceof ast_symbol_def_class) {
      mark_export((root.scope = defun.parents).def_function(root, defun), 1)
    } else if (root instanceof ast_symbol_var || root instanceof ast_symbol_let
      || root instanceof ast_symbol_const || root instanceof ast_symbol_catch) {
      let defined
      if (root instanceof ast_symbol_block) {
        defined = scope.def_variable(root, null)
      } else {
        defined = defun.def_variable(root, root.type == 'ast_symbol_var' ? null : undefined)
      }
      if (!(root instanceof ast_symbol_funarg)) mark_export(defined, 2)
      if (defun !== scope) {
        root.mark_enclosed()
        defined = scope.find_variable(root, options.imports)
        if (root.thedef !== defined) {
          root.thedef = defined
          root.reference()
        }
      }
    } else if (root instanceof ast_label_ref) {
      const sym = labels.get(root.name)
      if (!sym) throw new Error('undefined label ' + root.name)
      root.thedef = sym
    }
  })
  this.observe(trees)
  function mark_export (defined, level) {
    if (in_destructure) {
      let i = 0
      do { level++ } while (trees.parent(i++) !== in_destructure)
    }
    const root = trees.parent(level)
    if (defined.export = root instanceof ast_export ? dont_mangle : 0) {
      const exported = root.defined
      if ((exported instanceof ast_defun || exported instanceof ast_def_class) && root.is_default) {
        defined.export = want_mangle
      }
    }
  }
  const is_toplevel = this instanceof ast_toplevel
  if (is_toplevel) this.globals = new Map()
  trees = new observes(root => {
    if (root instanceof ast_loop_control && root.label) {
      root.label.thedef.references.push(root)
      return true
    }
    if (root instanceof ast_symbol_ref) {
      const name = root.name
      if (name == 'eval' && trees.parent() instanceof ast_call) {
        for (let s = root.scope; s && !s.eval; s = s.parents) {
          s.eval = true
        }
      }
      let sym
      if (trees.parent() instanceof ast_name_mapping && trees.parent(1).module_name
        || !(sym = root.scope.find_variable(root, options.imports))) {
        sym = toplevel.def_global(root)
        if (root instanceof ast_symbol_export) sym.export = dont_mangle
      } else if (sym.scope instanceof ast_lambda && name == 'arguments') {
        sym.scope.get_defun_scope().uses_args = true
      }
      root.thedef = sym
      root.reference()
      if (root.scope.is_block_scope() && !(sym.orig[0] instanceof ast_symbol_block)) root.scope = root.scope.get_defun_scope()
      return true
    }
    let defined
    if (root instanceof ast_symbol_catch && (defined = redefined_catch_def(root.defined()))) {
      let scope = root.scope
      while (scope) {
        push_uniq(scope.encl, defined)
        if (scope === defined.scope) break
        scope = scope.parents
      }
    }
  })
  this.observe(trees)
}

ast_toplevel.prototype.def_global = function (root) {
  const globals = this.globals, name = root.name
  if (globals.has(name)) {
    return globals.get(name)
  } else {
    const g = new symbol_def(this, root)
    g.undeclared = true
    g.global = true
    globals.set(name, g)
    return g
  }
}

ast_scope.prototype.init_scope_vars = function (parents) {
  this.variables = new Map()
  this.withs = false
  this.eval = false
  this.parents = parents
  this.encl = []
  this.cname = -1
}
ast_scope.prototype.conflicting_def = function (name, file) {
  return this.encl.find(defined => defined.name === name) || this.variables.has(file + '/' + name)
    || (this.parents && this.parents.conflicting_def(name, file))
}
ast_scope.prototype.conflicting_def_shallow = function (name, file) {
  return this.encl.find(defined => defined.name === name) || this.variables.has(file + '/' + name)
}
ast_scope.prototype.add_child_scope = function (scope) {
  if (scope.parents === this) return
  scope.parents = this
  if ((scope instanceof ast_arrow) && !this.uses_args) {
    this.uses_args = observe(scope, root => {
      if (root instanceof ast_symbol_ref && root.scope instanceof ast_lambda && root.name == 'arguments') return walk_abort
      if (root instanceof ast_lambda && !(root instanceof ast_arrow)) return true
    })
  }
  this.withs = this.withs || scope.withs
  this.eval = this.eval || scope.eval
  const scope_ancestry = (() => {
    const ancestry = []
    let cur = this
    do { ancestry.push(cur) } while ((cur = cur.parents))
    ancestry.reverse()
    return ancestry
  })()
  const new_scope_enclosed_set = new Set(scope.encl)
  const to_enclose = []
  for (const scope_topdown of scope_ancestry) {
    to_enclose.forEach(expr => push_uniq(scope_topdown.encl, expr))
    for (const defined of scope_topdown.variables.values()) {
      if (new_scope_enclosed_set.has(defined)) {
        push_uniq(to_enclose, defined)
        push_uniq(scope_topdown.encl, defined)
      }
    }
  }
}

function find_scopes_visible_from (scopes) {
  const found_scopes = new Set()
  for (const scope of new Set(scopes)) {
    (function bubble_up (scope) {
      if (scope == null || found_scopes.has(scope)) return
      found_scopes.add(scope)
      bubble_up(scope.parents)
    })(scope)
  }
  return [...found_scopes]
}

ast_scope.prototype.create_symbol = function (sym_class, { source, tentative_name, scope,
  conflict_scopes = [scope], init = null} = {}) {
  let symbol_name
  conflict_scopes = find_scopes_visible_from(conflict_scopes)
  if (tentative_name) {
    tentative_name = symbol_name = tentative_name.replace(/(?:^[^a-z_$]|[^a-z0-9_$])/ig, '_')
    let i = 0
    while (conflict_scopes.find(s => s.conflicting_def_shallow(symbol_name, s.file))) {
      symbol_name = tentative_name + '$' + i++
    }
  }
  if (!symbol_name) throw new Error('no symbol_name')
  const symbol = make_node(sym_class, source, { name: symbol_name, scope})
  this.def_variable(symbol, init || null)
  symbol.mark_enclosed()
  return symbol
}

tree.prototype.is_block_scope = return_false
ast_class.prototype.is_block_scope = return_false
ast_lambda.prototype.is_block_scope = return_false
ast_toplevel.prototype.is_block_scope = return_false
ast_switch_branch.prototype.is_block_scope = return_false
ast_block.prototype.is_block_scope = return_true
ast_scope.prototype.is_block_scope = function () { return this._block_scope || false }
ast_iteration_statement.prototype.is_block_scope = return_true
ast_lambda.prototype.init_scope_vars = function () {
  ast_scope.prototype.init_scope_vars.apply(this, arguments)
  this.uses_args = false
  this.def_variable(new ast_symbol_funarg({name: 'arguments', start: this.start, end: this.end, file: ''}))
}
ast_arrow.prototype.init_scope_vars = function () {
  ast_scope.prototype.init_scope_vars.apply(this, arguments)
  this.uses_args = false
}
ast_symbol.prototype.mark_enclosed = function () {
  const defined = this.defined()
  let scope = this.scope
  while (scope) {
    push_uniq(scope.encl, defined)
    if (scope === defined.scope) break
    scope = scope.parents
  }
}
ast_symbol.prototype.reference = function () {
  this.defined().references.push(this)
  this.mark_enclosed()
}
ast_scope.prototype.find_variable = function (root, imports) {
  let node_name = root.name
  if (root instanceof ast_symbol) {
    node_name = root.file + '/' + root.name
    if (imports && node_name in imports) node_name = imports[node_name]
    return this.variables.get(node_name) || (this.parents && this.parents.find_variable(node_name, imports))
  }
  return this.variables.get(root) || (this.parents && this.parents.find_variable(root, imports))
}
ast_scope.prototype.def_function = function (root, init) {
  let defined = this.def_variable(root, init)
  if (!defined.init || defined.init instanceof ast_defun) defined.init = init
  return defined
}
ast_scope.prototype.def_variable = function (root, init) {
  let name = root.file + '/' + root.name, defined = this.variables.get(name)
  if (defined) {
    defined.orig.push(root)
    if (defined.init && (defined.scope !== root.scope || defined.init instanceof ast_function)) defined.init = init
  } else {
    defined = new symbol_def(this, root, init)
    this.variables.set(name, defined)
    defined.global = !this.parents
  }
  return root.thedef = defined
}

function next_mangled (scope, options) {
  let defun_scope
  if (block_scopes && (defun_scope = scope.get_defun_scope()) && block_scopes.has(defun_scope)) scope = defun_scope
  const ext = scope.encl, nth = options.nth
  out: while (true) {
    const m = nth.get(++scope.cname)
    if (all_reserved_words.has(m)) continue
    if (options.reserved.has(m)) continue
    for (let i = ext.length; --i >= 0;) {
      const defined = ext[i]
      const name = defined.mangled_name || (defined.unmangleable(options) && defined.name)
      if (m == name) continue out
    }
    return m
  }
}

ast_scope.prototype.next_mangled = function (options) {
  return next_mangled(this, options)
}

ast_toplevel.prototype.next_mangled = function (options) {
  const names = this.mangled_names
  let name
  do { name = next_mangled(this, options) } while (names && names.has(name))
  return name
}

ast_function.prototype.next_mangled = function (options, defined) {
  const tricky_def = defined.orig[0] instanceof ast_symbol_funarg && this.name && this.name.defined()
  const tricky_name = tricky_def ? tricky_def.mangled_name || tricky_def.name : null
  let name
  while (true) {
    name = next_mangled(this, options)
    if (!tricky_name || tricky_name != name) return name
  }
}

ast_symbol.prototype.unmangleable = function (options) {
  const defined = this.defined()
  return !defined || defined.unmangleable(options)
}

ast_label.prototype.unmangleable = return_false

ast_symbol.prototype.unreferenced = function () {
  return !this.defined().references.length && !this.scope.pinned()
}

ast_symbol.prototype.defined = function () {
  return this.thedef
}

ast_symbol.prototype.global = function () {
  return this.thedef.global
}

function format_mangler_options (options) {
  options = defaults(options, {'eval': false, 'nth': base54, 'module': false, 'reserved': [], 'toplevel': false})
  if (options.module) options.toplevel = true
  if (!Array.isArray(options.reserved) && !(options.reserved instanceof Set)) options.reserved = []
  options.reserved = new Set(options.reserved)
  options.reserved.add('arguments')
  return options
}

ast_toplevel.prototype.mangle_names = function (options) {
  options = format_mangler_options(options)
  const nth = options.nth, to_mangle = []
  let lname = -1, block_scopes
  let trees = new observes(function (root, ascend) {
    function collect(symbol) { if (!options.reserved.has(symbol.name)) to_mangle.push(symbol) }
    if (root instanceof ast_labeled_statement) {
      const save_nesting = lname
      ascend()
      lname = save_nesting
      return true
    }
    if (root instanceof ast_defun && !(trees.parent() instanceof ast_scope)) {
      block_scopes = block_scopes || new Set()
      block_scopes.add(root.parents.get_defun_scope())
    }
    if (root instanceof ast_scope) {
      root.variables.forEach(collect)
      return
    }
    if (root.is_block_scope()) {
      root.blocks.variables.forEach(collect)
      return
    }
    if (root instanceof ast_label) {
      let name
      do { name = nth.get(++lname) } while (all_reserved_words.has(name))
      root.mangled_name = name
      return true
    }
    if (root instanceof ast_symbol_catch) {
      to_mangle.push(root.defined())
      return
    }
  })
  this.observe(trees)
  to_mangle.forEach(defined => defined.mangle(options))
  block_scopes = null
}

tree.prototype.tail_node = return_this

ast_sequence.prototype.tail_node = function () {
  return this.expressions[this.expressions.length - 1]
}

function skip_string (root) {
  if (root instanceof ast_string) {
    nth.consider(root.value, -1)
  } else if (root instanceof ast_conditional) {
    skip_string(root.consequent)
    skip_string(root.alt)
  } else if (root instanceof ast_sequence) {
    skip_string(root.tail_node())
  }
}

ast_toplevel.prototype.compute_char_frequency = function (options) {
  options = format_mangler_options(options)
  const nth = base54
  if (!nth.reset || !nth.consider || !nth.sort) return
  nth.reset()
  try {
    tree.prototype.print = function (stream, force_parens) {
      this._print(stream, force_parens)
      if (this instanceof ast_symbol && !this.unmangleable(options)) {
        nth.consider(this.name, -1)
      } else if (options.properties) {
        if (this instanceof ast_dot_hash) {
          nth.consider('#' + this.property, -1)
        } else if (this instanceof ast_dot) {
          nth.consider(this.property, -1)
        } else if (this instanceof ast_sub) {
          skip_string(this.property)
        }
      }
    }
    nth.consider(this.print_to_string(), 1)
  } finally {
    tree.prototype.print = tree.prototype._print
  }
  nth.sort()
}

const base54 = (() => {
  const leading = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ$_'.split('')
  let frequency = new Map(), chars
  function reset () {
    frequency = new Map()
    leading.forEach(function (char) {
      frequency.set(char, 0)
    })
  }
  function consider (string, delta) {
    for (let i = string.length; --i >= 0;) {
      frequency.set(string[i], frequency.get(string[i]) + delta)
    }
  }
  function compare (a, b) { return frequency.get(b) - frequency.get(a) }
  function sort () { chars = merge_sort(leading, compare) }
  reset()
  sort()
  const base = 54
  function get (num) {
    let name = ''
    num++
    do {
      num--
      name += chars[num % base]
      num = Math.floor(num / base)
    } while (num > 0)
    return name
  }
  return {get, consider, reset, sort}
})()

function observe (root, cb, to_visit = [root]) {
  const push = to_visit.push.bind(to_visit)
  while (to_visit.length) {
    const root = to_visit.pop()
    const result = cb(root, to_visit)
    if (result) {
      if (result === walk_abort) return true
      continue
    }
    root.branch(push)
  }
  return false
}

function walk_parent (root, cb, initial_stack) {
  const to_visit = [root]
  const push = to_visit.push.bind(to_visit)
  const stack = initial_stack ? initial_stack.slice() : []
  const parent_pop_indices = []
  let current
  const info = {
    parent: (n = 0) => {
      if (n === -1) return current
      if (initial_stack && n >= stack.length) {
        n -= stack.length
        return initial_stack[initial_stack.length - (n + 1)]
      }
      return stack[stack.length - (1 + n)]
    },
  }
  while (to_visit.length) {
    current = to_visit.pop()
    while (parent_pop_indices.length && to_visit.length == parent_pop_indices[parent_pop_indices.length - 1]) {
      stack.pop()
      parent_pop_indices.pop()
    }
    const result = cb(current, info)
    if (result) {
      if (result === walk_abort) return true
      continue
    }
    const visit_length = to_visit.length
    current.branch(push)
    if (to_visit.length > visit_length) {
      stack.push(current)
      parent_pop_indices.push(visit_length - 1)
    }
  }
  return false
}

const walk_abort = Symbol('abort observe')

class observes {
  constructor (callback) {
    this.callback = callback
    this.stack = []
    this.directives = {}
  }
  observe (root, ascend) {
    this.stack.push(root)
    const name = this.callback(root, ascend ? function () { ascend.call(root) } : func)
    if (!name && ascend) ascend.call(root)
    this.stack.pop()
    return name
  }
  push (root) {
    if (root instanceof ast_lambda) {
      this.directives = Object.create(this.directives)
    } else if (root instanceof ast_directive && !this.directives[root.value]) {
      this.directives[root.value] = root
    } else if (root instanceof ast_class) {
      this.directives = Object.create(this.directives)
    }
    this.stack.push(root)
  }
  pop () {
    const root = this.stack.pop()
    if (root instanceof ast_lambda || root instanceof ast_class) {
      this.directives = Object.getPrototypeOf(this.directives)
    }
  }
  parent (n) {
    return this.stack[this.stack.length - 2 - (n || 0)]
  }
  self () {
    return this.stack[this.stack.length - 1]
  }
  find_parent (type) {
    const stack = this.stack
    let i, x
    for (i = stack.length; --i >= 0;) {
      x = stack[i]
      if (x instanceof type) return x
    }
  }
  find_scope () {
    const stack = this.stack
    let i, x
    for (i = stack.length; --i >= 0;) {
      x = stack[i]
      if (x instanceof ast_toplevel) return x
      if (x instanceof ast_lambda) return x
      if (x.blocks) return x.blocks
    }
  }
  has_directive (type) {
    const dir = this.directives[type]
    if (dir) return dir
    const root = this.stack[this.stack.length - 1]
    if (root instanceof ast_scope && root.body) {
      for (let i = 0; i < root.body.length; ++i) {
        const st = root.body[i]
        if (!(st instanceof ast_directive)) break
        if (st.value == type) return st
      }
    }
  }
  loopcontrol (root) {
    const stack = this.stack
    let i, x
    if (root.label) {
      for (i = stack.length; --i >= 0;) {
        x = stack[i]
        if (x instanceof ast_labeled_statement && x.label.name == root.label.name) return x.body
      } 
    } else {
      for (i = stack.length; --i >= 0;) {
        x = stack[i]
        if (x instanceof ast_iteration_statement || root instanceof ast_break && x instanceof ast_switch) return x
      }
    }
  }
}

class transforms extends observes {
  constructor (before, after) {
    super()
    this.after = after
    this.before = before
  }
}

function mangle_props (ast, options) {
  let cprivate = -1
  const nth = base54, private_cache = new Map()
  function mangle_private(name) {
    let mangled = private_cache.get(name)
    if (!mangled) {
      mangled = nth.get(++cprivate)
      private_cache.set(name, mangled)
    }
    return mangled
  }
  ast = ast.transform(new transforms(function (root) {
    if (root instanceof ast_private_property || root instanceof ast_private_method || root instanceof ast_private_getter
        || root instanceof ast_private_setter || root instanceof ast_private_in) {
      root.key.name = mangle_private(root.key.name)
    } else if (root instanceof ast_dot_hash) {
      root.property = mangle_private(root.property)
    }
  }))
  return ast
}

function first_in_statement (stack) {
  let root = stack.parent(-1)
  for (let i = 0, p; p = stack.parent(i); i++) {
    if (p instanceof ast_state && p.body === root) return true
    if ((p instanceof ast_sequence && p.expressions[0] === root) ||
      (p.type == 'ast_call' && p.expr === root) ||
      (p instanceof ast_prefixed_template && p.prefix === root) ||
      (p instanceof ast_dot && p.expr === root) ||
      (p instanceof ast_sub && p.expr === root) ||
      (p instanceof ast_chain && p.expr === root) ||
      (p instanceof ast_conditional && p.condition === root) ||
      (p instanceof ast_binary && p.left === root) ||
      (p instanceof ast_unary_postfix && p.expr === root)) {
      root = p
    } else {
      return false
    }
  }
}

const _pure = 1
const _inline = 2
const _noinline = 4
const _key = 8
const _mangleprop = 16
const keywords_atom = make_set('false null true')
const keywords = make_set('break case catch class const continue debugger default delete do else export extends finally for function if in instanceof let new return switch throw try typeof var void while with')
const reserved_words = new Set([...make_set('enum import super this'), ...keywords_atom, ...keywords])
const all_reserved_words = new Set([...make_set('implements interface package private protected public static'), ...reserved_words])
const keywords_before_expression = make_set( 'return new delete throw else case yield await')
const operator_chars = make_set(chars('+-*&%=<>!?|~^'))
const re_num_literal = /[0-9a-f]/i
const re_hex_number = /^0x[0-9a-f]+$/i
const re_oct_number = /^0[0-7]+$/
const re_es6_oct_number = /^0o[0-7]+$/i
const re_bin_number = /^0b[01]+$/i
const re_dec_number = /^\d*\.?\d*(?:e[+-]?\d*(?:\d\.?|\.?\d)\d*)?$/i
const re_big_int = /^(0[xob])?[0-9a-f]+n$/i
const operators = make_set([ 'in', 'instanceof', 'typeof', 'new', 'void', 'delete', '++', '--', '+', '-', '!', '~', '&', '|', '^', '*', '**', '/', '%', '>>', '<<',
 '>>>', '<', '>', '<=', '>=', '==', '===', '!=', '!==', '?', '=', '+=', '-=', '||=', '&&=', '??=', '/=', '*=', '**=', '%=', '>>=', '<<=', '>>>=', '|=', '^=', '&=', '&&', '??', '||' ])
const whitespace_chars = make_set(chars(' \u00a0\n\r\t\f\u000b\u200b\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000\uFEFF'))
const newline_chars = make_set(chars('\n\r\u2028\u2029'))
const punc_after_expression = make_set(chars(']),:'))
const punc_before_expression = make_set(chars('[{(,;:'))
const punc_chars = make_set(chars('[]{}(),;:'))
const unicode = {
  ustart: /[$A-Z_a-z\xAA\xB5\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0370-\u0374\u0376\u0377\u037A-\u037D\u037F\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u048A-\u052F\u0531-\u0556\u0559\u0561-\u0587\u05D0-\u05EA\u05F0-\u05F2\u0620-\u064A\u066E\u066F\u0671-\u06D3\u06D5\u06E5\u06E6\u06EE\u06EF\u06FA-\u06FC\u06FF\u0710\u0712-\u072F\u074D-\u07A5\u07B1\u07CA-\u07EA\u07F4\u07F5\u07FA\u0800-\u0815\u081A\u0824\u0828\u0840-\u0858\u08A0-\u08B4\u0904-\u0939\u093D\u0950\u0958-\u0961\u0971-\u0980\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BD\u09CE\u09DC\u09DD\u09DF-\u09E1\u09F0\u09F1\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A59-\u0A5C\u0A5E\u0A72-\u0A74\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABD\u0AD0\u0AE0\u0AE1\u0AF9\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3D\u0B5C\u0B5D\u0B5F-\u0B61\u0B71\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BD0\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D\u0C58-\u0C5A\u0C60\u0C61\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBD\u0CDE\u0CE0\u0CE1\u0CF1\u0CF2\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D\u0D4E\u0D5F-\u0D61\u0D7A-\u0D7F\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0E01-\u0E30\u0E32\u0E33\u0E40-\u0E46\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB0\u0EB2\u0EB3\u0EBD\u0EC0-\u0EC4\u0EC6\u0EDC-\u0EDF\u0F00\u0F40-\u0F47\u0F49-\u0F6C\u0F88-\u0F8C\u1000-\u102A\u103F\u1050-\u1055\u105A-\u105D\u1061\u1065\u1066\u106E-\u1070\u1075-\u1081\u108E\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u1380-\u138F\u13A0-\u13F5\u13F8-\u13FD\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F8\u1700-\u170C\u170E-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176C\u176E-\u1770\u1780-\u17B3\u17D7\u17DC\u1820-\u1877\u1880-\u18A8\u18AA\u18B0-\u18F5\u1900-\u191E\u1950-\u196D\u1970-\u1974\u1980-\u19AB\u19B0-\u19C9\u1A00-\u1A16\u1A20-\u1A54\u1AA7\u1B05-\u1B33\u1B45-\u1B4B\u1B83-\u1BA0\u1BAE\u1BAF\u1BBA-\u1BE5\u1C00-\u1C23\u1C4D-\u1C4F\u1C5A-\u1C7D\u1CE9-\u1CEC\u1CEE-\u1CF1\u1CF5\u1CF6\u1D00-\u1DBF\u1E00-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u2071\u207F\u2090-\u209C\u2102\u2107\u210A-\u2113\u2115\u2118-\u211D\u2124\u2126\u2128\u212A-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2160-\u2188\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CEE\u2CF2\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D80-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303C\u3041-\u3096\u309B-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312D\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FD5\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA61F\uA62A\uA62B\uA640-\uA66E\uA67F-\uA69D\uA6A0-\uA6EF\uA717-\uA71F\uA722-\uA788\uA78B-\uA7AD\uA7B0-\uA7B7\uA7F7-\uA801\uA803-\uA805\uA807-\uA80A\uA80C-\uA822\uA840-\uA873\uA882-\uA8B3\uA8F2-\uA8F7\uA8FB\uA8FD\uA90A-\uA925\uA930-\uA946\uA960-\uA97C\uA984-\uA9B2\uA9CF\uA9E0-\uA9E4\uA9E6-\uA9EF\uA9FA-\uA9FE\uAA00-\uAA28\uAA40-\uAA42\uAA44-\uAA4B\uAA60-\uAA76\uAA7A\uAA7E-\uAAAF\uAAB1\uAAB5\uAAB6\uAAB9-\uAABD\uAAC0\uAAC2\uAADB-\uAADD\uAAE0-\uAAEA\uAAF2-\uAAF4\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uAB30-\uAB5A\uAB5C-\uAB65\uAB70-\uABE2\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D\uFB1F-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE70-\uFE74\uFE76-\uFEFC\uFF21-\uFF3A\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]|\uD800[\uDC00-\uDC0B\uDC0D-\uDC26\uDC28-\uDC3A\uDC3C\uDC3D\uDC3F-\uDC4D\uDC50-\uDC5D\uDC80-\uDCFA\uDD40-\uDD74\uDE80-\uDE9C\uDEA0-\uDED0\uDF00-\uDF1F\uDF30-\uDF4A\uDF50-\uDF75\uDF80-\uDF9D\uDFA0-\uDFC3\uDFC8-\uDFCF\uDFD1-\uDFD5]|\uD801[\uDC00-\uDC9D\uDD00-\uDD27\uDD30-\uDD63\uDE00-\uDF36\uDF40-\uDF55\uDF60-\uDF67]|\uD802[\uDC00-\uDC05\uDC08\uDC0A-\uDC35\uDC37\uDC38\uDC3C\uDC3F-\uDC55\uDC60-\uDC76\uDC80-\uDC9E\uDCE0-\uDCF2\uDCF4\uDCF5\uDD00-\uDD15\uDD20-\uDD39\uDD80-\uDDB7\uDDBE\uDDBF\uDE00\uDE10-\uDE13\uDE15-\uDE17\uDE19-\uDE33\uDE60-\uDE7C\uDE80-\uDE9C\uDEC0-\uDEC7\uDEC9-\uDEE4\uDF00-\uDF35\uDF40-\uDF55\uDF60-\uDF72\uDF80-\uDF91]|\uD803[\uDC00-\uDC48\uDC80-\uDCB2\uDCC0-\uDCF2]|\uD804[\uDC03-\uDC37\uDC83-\uDCAF\uDCD0-\uDCE8\uDD03-\uDD26\uDD50-\uDD72\uDD76\uDD83-\uDDB2\uDDC1-\uDDC4\uDDDA\uDDDC\uDE00-\uDE11\uDE13-\uDE2B\uDE80-\uDE86\uDE88\uDE8A-\uDE8D\uDE8F-\uDE9D\uDE9F-\uDEA8\uDEB0-\uDEDE\uDF05-\uDF0C\uDF0F\uDF10\uDF13-\uDF28\uDF2A-\uDF30\uDF32\uDF33\uDF35-\uDF39\uDF3D\uDF50\uDF5D-\uDF61]|\uD805[\uDC80-\uDCAF\uDCC4\uDCC5\uDCC7\uDD80-\uDDAE\uDDD8-\uDDDB\uDE00-\uDE2F\uDE44\uDE80-\uDEAA\uDF00-\uDF19]|\uD806[\uDCA0-\uDCDF\uDCFF\uDEC0-\uDEF8]|\uD808[\uDC00-\uDF99]|\uD809[\uDC00-\uDC6E\uDC80-\uDD43]|[\uD80C\uD840-\uD868\uD86A-\uD86C\uD86F-\uD872][\uDC00-\uDFFF]|\uD80D[\uDC00-\uDC2E]|\uD811[\uDC00-\uDE46]|\uD81A[\uDC00-\uDE38\uDE40-\uDE5E\uDED0-\uDEED\uDF00-\uDF2F\uDF40-\uDF43\uDF63-\uDF77\uDF7D-\uDF8F]|\uD81B[\uDF00-\uDF44\uDF50\uDF93-\uDF9F]|\uD82C[\uDC00\uDC01]|\uD82F[\uDC00-\uDC6A\uDC70-\uDC7C\uDC80-\uDC88\uDC90-\uDC99]|\uD835[\uDC00-\uDC54\uDC56-\uDC9C\uDC9E\uDC9F\uDCA2\uDCA5\uDCA6\uDCA9-\uDCAC\uDCAE-\uDCB9\uDCBB\uDCBD-\uDCC3\uDCC5-\uDD05\uDD07-\uDD0A\uDD0D-\uDD14\uDD16-\uDD1C\uDD1E-\uDD39\uDD3B-\uDD3E\uDD40-\uDD44\uDD46\uDD4A-\uDD50\uDD52-\uDEA5\uDEA8-\uDEC0\uDEC2-\uDEDA\uDEDC-\uDEFA\uDEFC-\uDF14\uDF16-\uDF34\uDF36-\uDF4E\uDF50-\uDF6E\uDF70-\uDF88\uDF8A-\uDFA8\uDFAA-\uDFC2\uDFC4-\uDFCB]|\uD83A[\uDC00-\uDCC4]|\uD83B[\uDE00-\uDE03\uDE05-\uDE1F\uDE21\uDE22\uDE24\uDE27\uDE29-\uDE32\uDE34-\uDE37\uDE39\uDE3B\uDE42\uDE47\uDE49\uDE4B\uDE4D-\uDE4F\uDE51\uDE52\uDE54\uDE57\uDE59\uDE5B\uDE5D\uDE5F\uDE61\uDE62\uDE64\uDE67-\uDE6A\uDE6C-\uDE72\uDE74-\uDE77\uDE79-\uDE7C\uDE7E\uDE80-\uDE89\uDE8B-\uDE9B\uDEA1-\uDEA3\uDEA5-\uDEA9\uDEAB-\uDEBB]|\uD869[\uDC00-\uDED6\uDF00-\uDFFF]|\uD86D[\uDC00-\uDF34\uDF40-\uDFFF]|\uD86E[\uDC00-\uDC1D\uDC20-\uDFFF]|\uD873[\uDC00-\uDEA1]|\uD87E[\uDC00-\uDE1D]/,
  ucontinue: /(?:[$0-9A-Z_a-z\xAA\xB5\xB7\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0300-\u0374\u0376\u0377\u037A-\u037D\u037F\u0386-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u0483-\u0487\u048A-\u052F\u0531-\u0556\u0559\u0561-\u0587\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7\u05D0-\u05EA\u05F0-\u05F2\u0610-\u061A\u0620-\u0669\u066E-\u06D3\u06D5-\u06DC\u06DF-\u06E8\u06EA-\u06FC\u06FF\u0710-\u074A\u074D-\u07B1\u07C0-\u07F5\u07FA\u0800-\u082D\u0840-\u085B\u08A0-\u08B4\u08E3-\u0963\u0966-\u096F\u0971-\u0983\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BC-\u09C4\u09C7\u09C8\u09CB-\u09CE\u09D7\u09DC\u09DD\u09DF-\u09E3\u09E6-\u09F1\u0A01-\u0A03\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A3C\u0A3E-\u0A42\u0A47\u0A48\u0A4B-\u0A4D\u0A51\u0A59-\u0A5C\u0A5E\u0A66-\u0A75\u0A81-\u0A83\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABC-\u0AC5\u0AC7-\u0AC9\u0ACB-\u0ACD\u0AD0\u0AE0-\u0AE3\u0AE6-\u0AEF\u0AF9\u0B01-\u0B03\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3C-\u0B44\u0B47\u0B48\u0B4B-\u0B4D\u0B56\u0B57\u0B5C\u0B5D\u0B5F-\u0B63\u0B66-\u0B6F\u0B71\u0B82\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BBE-\u0BC2\u0BC6-\u0BC8\u0BCA-\u0BCD\u0BD0\u0BD7\u0BE6-\u0BEF\u0C00-\u0C03\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D-\u0C44\u0C46-\u0C48\u0C4A-\u0C4D\u0C55\u0C56\u0C58-\u0C5A\u0C60-\u0C63\u0C66-\u0C6F\u0C81-\u0C83\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBC-\u0CC4\u0CC6-\u0CC8\u0CCA-\u0CCD\u0CD5\u0CD6\u0CDE\u0CE0-\u0CE3\u0CE6-\u0CEF\u0CF1\u0CF2\u0D01-\u0D03\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D-\u0D44\u0D46-\u0D48\u0D4A-\u0D4E\u0D57\u0D5F-\u0D63\u0D66-\u0D6F\u0D7A-\u0D7F\u0D82\u0D83\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0DCA\u0DCF-\u0DD4\u0DD6\u0DD8-\u0DDF\u0DE6-\u0DEF\u0DF2\u0DF3\u0E01-\u0E3A\u0E40-\u0E4E\u0E50-\u0E59\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB9\u0EBB-\u0EBD\u0EC0-\u0EC4\u0EC6\u0EC8-\u0ECD\u0ED0-\u0ED9\u0EDC-\u0EDF\u0F00\u0F18\u0F19\u0F20-\u0F29\u0F35\u0F37\u0F39\u0F3E-\u0F47\u0F49-\u0F6C\u0F71-\u0F84\u0F86-\u0F97\u0F99-\u0FBC\u0FC6\u1000-\u1049\u1050-\u109D\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u135D-\u135F\u1369-\u1371\u1380-\u138F\u13A0-\u13F5\u13F8-\u13FD\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F8\u1700-\u170C\u170E-\u1714\u1720-\u1734\u1740-\u1753\u1760-\u176C\u176E-\u1770\u1772\u1773\u1780-\u17D3\u17D7\u17DC\u17DD\u17E0-\u17E9\u180B-\u180D\u1810-\u1819\u1820-\u1877\u1880-\u18AA\u18B0-\u18F5\u1900-\u191E\u1920-\u192B\u1930-\u193B\u1946-\u196D\u1970-\u1974\u1980-\u19AB\u19B0-\u19C9\u19D0-\u19DA\u1A00-\u1A1B\u1A20-\u1A5E\u1A60-\u1A7C\u1A7F-\u1A89\u1A90-\u1A99\u1AA7\u1AB0-\u1ABD\u1B00-\u1B4B\u1B50-\u1B59\u1B6B-\u1B73\u1B80-\u1BF3\u1C00-\u1C37\u1C40-\u1C49\u1C4D-\u1C7D\u1CD0-\u1CD2\u1CD4-\u1CF6\u1CF8\u1CF9\u1D00-\u1DF5\u1DFC-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u200C\u200D\u203F\u2040\u2054\u2071\u207F\u2090-\u209C\u20D0-\u20DC\u20E1\u20E5-\u20F0\u2102\u2107\u210A-\u2113\u2115\u2118-\u211D\u2124\u2126\u2128\u212A-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2160-\u2188\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D7F-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2DE0-\u2DFF\u3005-\u3007\u3021-\u302F\u3031-\u3035\u3038-\u303C\u3041-\u3096\u3099-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312D\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FD5\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA62B\uA640-\uA66F\uA674-\uA67D\uA67F-\uA6F1\uA717-\uA71F\uA722-\uA788\uA78B-\uA7AD\uA7B0-\uA7B7\uA7F7-\uA827\uA840-\uA873\uA880-\uA8C4\uA8D0-\uA8D9\uA8E0-\uA8F7\uA8FB\uA8FD\uA900-\uA92D\uA930-\uA953\uA960-\uA97C\uA980-\uA9C0\uA9CF-\uA9D9\uA9E0-\uA9FE\uAA00-\uAA36\uAA40-\uAA4D\uAA50-\uAA59\uAA60-\uAA76\uAA7A-\uAAC2\uAADB-\uAADD\uAAE0-\uAAEF\uAAF2-\uAAF6\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uAB30-\uAB5A\uAB5C-\uAB65\uAB70-\uABEA\uABEC\uABED\uABF0-\uABF9\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE00-\uFE0F\uFE20-\uFE2F\uFE33\uFE34\uFE4D-\uFE4F\uFE70-\uFE74\uFE76-\uFEFC\uFF10-\uFF19\uFF21-\uFF3A\uFF3F\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]|\uD800[\uDC00-\uDC0B\uDC0D-\uDC26\uDC28-\uDC3A\uDC3C\uDC3D\uDC3F-\uDC4D\uDC50-\uDC5D\uDC80-\uDCFA\uDD40-\uDD74\uDDFD\uDE80-\uDE9C\uDEA0-\uDED0\uDEE0\uDF00-\uDF1F\uDF30-\uDF4A\uDF50-\uDF7A\uDF80-\uDF9D\uDFA0-\uDFC3\uDFC8-\uDFCF\uDFD1-\uDFD5]|\uD801[\uDC00-\uDC9D\uDCA0-\uDCA9\uDD00-\uDD27\uDD30-\uDD63\uDE00-\uDF36\uDF40-\uDF55\uDF60-\uDF67]|\uD802[\uDC00-\uDC05\uDC08\uDC0A-\uDC35\uDC37\uDC38\uDC3C\uDC3F-\uDC55\uDC60-\uDC76\uDC80-\uDC9E\uDCE0-\uDCF2\uDCF4\uDCF5\uDD00-\uDD15\uDD20-\uDD39\uDD80-\uDDB7\uDDBE\uDDBF\uDE00-\uDE03\uDE05\uDE06\uDE0C-\uDE13\uDE15-\uDE17\uDE19-\uDE33\uDE38-\uDE3A\uDE3F\uDE60-\uDE7C\uDE80-\uDE9C\uDEC0-\uDEC7\uDEC9-\uDEE6\uDF00-\uDF35\uDF40-\uDF55\uDF60-\uDF72\uDF80-\uDF91]|\uD803[\uDC00-\uDC48\uDC80-\uDCB2\uDCC0-\uDCF2]|\uD804[\uDC00-\uDC46\uDC66-\uDC6F\uDC7F-\uDCBA\uDCD0-\uDCE8\uDCF0-\uDCF9\uDD00-\uDD34\uDD36-\uDD3F\uDD50-\uDD73\uDD76\uDD80-\uDDC4\uDDCA-\uDDCC\uDDD0-\uDDDA\uDDDC\uDE00-\uDE11\uDE13-\uDE37\uDE80-\uDE86\uDE88\uDE8A-\uDE8D\uDE8F-\uDE9D\uDE9F-\uDEA8\uDEB0-\uDEEA\uDEF0-\uDEF9\uDF00-\uDF03\uDF05-\uDF0C\uDF0F\uDF10\uDF13-\uDF28\uDF2A-\uDF30\uDF32\uDF33\uDF35-\uDF39\uDF3C-\uDF44\uDF47\uDF48\uDF4B-\uDF4D\uDF50\uDF57\uDF5D-\uDF63\uDF66-\uDF6C\uDF70-\uDF74]|\uD805[\uDC80-\uDCC5\uDCC7\uDCD0-\uDCD9\uDD80-\uDDB5\uDDB8-\uDDC0\uDDD8-\uDDDD\uDE00-\uDE40\uDE44\uDE50-\uDE59\uDE80-\uDEB7\uDEC0-\uDEC9\uDF00-\uDF19\uDF1D-\uDF2B\uDF30-\uDF39]|\uD806[\uDCA0-\uDCE9\uDCFF\uDEC0-\uDEF8]|\uD808[\uDC00-\uDF99]|\uD809[\uDC00-\uDC6E\uDC80-\uDD43]|[\uD80C\uD840-\uD868\uD86A-\uD86C\uD86F-\uD872][\uDC00-\uDFFF]|\uD80D[\uDC00-\uDC2E]|\uD811[\uDC00-\uDE46]|\uD81A[\uDC00-\uDE38\uDE40-\uDE5E\uDE60-\uDE69\uDED0-\uDEED\uDEF0-\uDEF4\uDF00-\uDF36\uDF40-\uDF43\uDF50-\uDF59\uDF63-\uDF77\uDF7D-\uDF8F]|\uD81B[\uDF00-\uDF44\uDF50-\uDF7E\uDF8F-\uDF9F]|\uD82C[\uDC00\uDC01]|\uD82F[\uDC00-\uDC6A\uDC70-\uDC7C\uDC80-\uDC88\uDC90-\uDC99\uDC9D\uDC9E]|\uD834[\uDD65-\uDD69\uDD6D-\uDD72\uDD7B-\uDD82\uDD85-\uDD8B\uDDAA-\uDDAD\uDE42-\uDE44]|\uD835[\uDC00-\uDC54\uDC56-\uDC9C\uDC9E\uDC9F\uDCA2\uDCA5\uDCA6\uDCA9-\uDCAC\uDCAE-\uDCB9\uDCBB\uDCBD-\uDCC3\uDCC5-\uDD05\uDD07-\uDD0A\uDD0D-\uDD14\uDD16-\uDD1C\uDD1E-\uDD39\uDD3B-\uDD3E\uDD40-\uDD44\uDD46\uDD4A-\uDD50\uDD52-\uDEA5\uDEA8-\uDEC0\uDEC2-\uDEDA\uDEDC-\uDEFA\uDEFC-\uDF14\uDF16-\uDF34\uDF36-\uDF4E\uDF50-\uDF6E\uDF70-\uDF88\uDF8A-\uDFA8\uDFAA-\uDFC2\uDFC4-\uDFCB\uDFCE-\uDFFF]|\uD836[\uDE00-\uDE36\uDE3B-\uDE6C\uDE75\uDE84\uDE9B-\uDE9F\uDEA1-\uDEAF]|\uD83A[\uDC00-\uDCC4\uDCD0-\uDCD6]|\uD83B[\uDE00-\uDE03\uDE05-\uDE1F\uDE21\uDE22\uDE24\uDE27\uDE29-\uDE32\uDE34-\uDE37\uDE39\uDE3B\uDE42\uDE47\uDE49\uDE4B\uDE4D-\uDE4F\uDE51\uDE52\uDE54\uDE57\uDE59\uDE5B\uDE5D\uDE5F\uDE61\uDE62\uDE64\uDE67-\uDE6A\uDE6C-\uDE72\uDE74-\uDE77\uDE79-\uDE7C\uDE7E\uDE80-\uDE89\uDE8B-\uDE9B\uDEA1-\uDEA3\uDEA5-\uDEA9\uDEAB-\uDEBB]|\uD869[\uDC00-\uDED6\uDF00-\uDFFF]|\uD86D[\uDC00-\uDF34\uDF40-\uDFFF]|\uD86E[\uDC00-\uDC1D\uDC20-\uDFFF]|\uD873[\uDC00-\uDEA1]|\uD87E[\uDC00-\uDE1D]|\uDB40[\uDD00-\uDDEF])+/,
}

function get_full_char (string, pos) {
  if (is_surrogate_pair_head(string.charCodeAt(pos))) {
    if (is_surrogate_pair_tail(string.charCodeAt(pos + 1))) {
      return string.charAt(pos) + string.charAt(pos + 1)
    }
  } else if (is_surrogate_pair_tail(string.charCodeAt(pos))) {
    if (is_surrogate_pair_head(string.charCodeAt(pos - 1))) {
      return string.charAt(pos - 1) + string.charAt(pos)
    }
  }
  return string.charAt(pos)
}

function get_full_char_code (string, pos) {
  if (is_surrogate_pair_head(string.charCodeAt(pos))) {
    return 0x10000 + (string.charCodeAt(pos) - 0xd800 << 10) + string.charCodeAt(pos + 1) - 0xdc00
  }
  return string.charCodeAt(pos)
}

function get_full_char_length (string) {
  let surrogates = 0, i, len
  for (i = 0, len = string.length; i < len; i++) {
    if (is_surrogate_pair_head(string.charCodeAt(i)) && is_surrogate_pair_tail(string.charCodeAt(i + 1))) {
      surrogates++
      i++
    }
  }
  return string.length - surrogates
}

function from_char_code (code) {
  if (code > 0xFFFF) {
    code -= 0x10000
    return (String.fromCharCode((code >> 10) + 0xD800) + String.fromCharCode((code % 0x400) + 0xDC00))
  }
  return String.fromCharCode(code)
}

function is_surrogate_pair_head (code) { return code >= 0xd800 && code <= 0xdbff }

function is_surrogate_pair_tail (code) { return code >= 0xdc00 && code <= 0xdfff }

function is_digit (code) { return code >= 48 && code <= 57 }

function is_identifier_start (char) { return unicode.ustart.test(char) }

function is_identifier_char (char) { return unicode.ucontinue.test(char) }

const basic_indent = /^[a-z_$][a-z0-9_$]*$/i

function is_basic_identifier_string (string) { return basic_indent.test(string) }

function is_identifier_string (string, allow_surrogates) {
  if (basic_indent.test(string)) return true
  if (!allow_surrogates && /[\ud800-\udfff]/.test(string)) return false
  let match = unicode.ustart.exec(string)
  if (!match || match.index !== 0) return false
  string = string.slice(match[0].length)
  if (!string) return true
  match = unicode.ucontinue.exec(string)
  return !!match && match[0].length === string.length
}

function parse_js_number (num, allow_e = true) {
  if (!allow_e && member('e', num)) return NaN
  if (re_hex_number.test(num)) {
    return parseInt(num.substr(2), 16)
  } else if (re_oct_number.test(num)) {
    return parseInt(num.substr(1), 8)
  } else if (re_es6_oct_number.test(num)) {
    return parseInt(num.substr(2), 8)
  } else if (re_bin_number.test(num)) {
    return parseInt(num.substr(2), 2)
  } else if (re_dec_number.test(num)) {
    return parseFloat(num)
  } else {
    const val = parseFloat(num)
    if (val == num) return val
  }
}

class parse_error extends Error {
  constructor (message, file, line, col, pos) {
    super()
    this.name = 'SyntaxError'
    this.message = message
    this.file = file
    this.line = line
    this.col = col
    this.pos = pos
  }
}

function js_error (message, file, line, col, pos) {
  throw new parse_error(message, file, line, col, pos)
}

const new_line = 1
const single_quote = 2
const exists_quote = 4
const end_templace = 8
function has_tok_flag (self, flag) { return !!(self.flags & flag) }
function set_tok_flag (self, flag, truth) { return (truth ? self.flags | flag : self.flags & ~flag) }

class ast_token {
  constructor (type, value, line, col, pos, nlb, comments_before, comments_after, file) {
    this.flags = (nlb ? 1 : 0)
    this.type = type
    this.value = value
    this.line = line
    this.col = col
    this.pos = pos
    this.comments_before = comments_before
    this.comments_after = comments_after
    this.file = file
  }
  nlb () {
    return has_tok_flag(this, new_line)
  }
  set_nlb (new_nlb) {
    this.flags = set_tok_flag(this, new_line, new_nlb)
  }
  quote () {
    return has_tok_flag(this, exists_quote) ? '"' : ''
  }
  set_quote (quote_type) {
    this.flags = set_tok_flag(this, single_quote, quote_type == '"')
    this.flags = set_tok_flag(this, exists_quote, !!quote_type)
  }
  template_end () {
    return has_tok_flag(this, end_templace)
  }
  set_template_end (new_template_end) {
    this.flags = set_tok_flag(this, end_templace, new_template_end)
  }
}

function is_token (token, type, val) {
  return token.type == type && (val == null || token.value == val)
}

let latest_raw = '', template_raws = new Map()

function tokenizer (text, file, comments, shebang) {
  const scope = {text, file, pos: 0, tokpos: 0, line: 1, tokline: 0, col: 0, tokcol: 0,
    newline_before: false, regex_allowed: false, brace_counter: 0,
    template_braces: [], comments_before: [], directives: {}, directive_stack: []}

  function peek () { return get_full_char(scope.text, scope.pos) }

  function is_option_chain_op () {
    const must_be_dot = scope.text.charCodeAt(scope.pos + 1) === 46
    if (!must_be_dot) return false
    const cannot_be_digit = scope.text.charCodeAt(scope.pos + 2)
    return cannot_be_digit < 48 || cannot_be_digit > 57
  }

  function next (signal_eof, in_string) {
    let char = get_full_char(scope.text, scope.pos++)
    if (signal_eof && !char) throw ''
    if (newline_chars.has(char)) {
      scope.newline_before = scope.newline_before || !in_string
      ++scope.line
      scope.col = 0
      if (char == '\r' && peek() == '\n') {
        ++scope.pos
        char = '\n'
      }
    } else {
      if (char.length > 1) {
        ++scope.pos
        ++scope.col
      }
      ++scope.col
    }
    return char
  }

  function forward (i) { while (i--) next() }

  function looking_at (string) { return scope.text.substr(scope.pos, string.length) == string }

  function find_eol () {
    const text = scope.text
    let i, n, char
    for (i = scope.pos, n = scope.text.length; i < n; ++i) {
      char = text[i]
      if (newline_chars.has(char)) return i
    }
    return -1
  }

  function find (what, signal_eof) {
    const pos = scope.text.indexOf(what, scope.pos)
    if (signal_eof && pos == -1) throw ''
    return pos
  }

  function start_token () {
    scope.tokline = scope.line
    scope.tokcol = scope.col
    scope.tokpos = scope.pos
  }

  let prev_was_dot = false, previous_token = null

  function token (type, value, is_comment) {
    scope.regex_allowed = ((type == 'operator' && !UNARY_POSTFIX.has(value)) ||
               (type == 'keyword' && keywords_before_expression.has(value)) ||
               (type == 'punc' && punc_before_expression.has(value))) ||
               (type == 'arrow')
    prev_was_dot = type == 'punc' && (value == '.' || value == '?.') ? true : false
    const line = scope.tokline
    const col = scope.tokcol
    const pos = scope.tokpos
    const nlb = scope.newline_before
    let comments_before = []
    let comments_after = []
    if (!is_comment) {
      comments_before = scope.comments_before
      comments_after = scope.comments_before = []
    }
    scope.newline_before = false
    const tok = new ast_token(type, value, line, col, pos, nlb, comments_before, comments_after, file)
    if (!is_comment) previous_token = tok
    return tok
  }

  function skip_whitespace () {
    while (whitespace_chars.has(peek())) next()
  }

  function read_while (pred) {
    let result = '', char, i = 0
    while ((char = peek()) && pred(char, i++)) result += next()
    return result
  }

  function pr (err) {
    js_error(err, file, scope.tokline, scope.tokcol, scope.tokpos)
  }

  function read_num (prefix) {
    let has_e = false, after_e = false, has_x = false, has_dot = prefix == '.', is_big_int = false, numeric_separator = false
    let num = read_while(function (char, i) {
      if (is_big_int) return false
      switch (char.charCodeAt(0)) {
        case 95:
          return (numeric_separator = true)
        case 98: case 66:
          return (has_x = true)
        case 111: case 79: case 120: case 88:
          return has_x ? false : (has_x = true)
        case 101: case 69:
          return has_x ? true : has_e ? false : (has_e = after_e = true)
        case 45:
          return after_e || (i == 0 && !prefix)
        case 43:
          return after_e
        case (after_e = false, 46):
          return (!has_dot && !has_x && !has_e) ? (has_dot = true) : false
      }
      if (char == 'n') {
        is_big_int = true
        return true
      }
      return re_num_literal.test(char)
    })
    if (prefix) num = prefix + num
    latest_raw = num
    if (numeric_separator) {
      if (num.endsWith('_')) {
        pr('numeric separators are not allowed at the end of numeric literals')
      } else if (member('__', num)) {
        pr('one underscore is allowed as numeric separator')
      }
      num = num.replace(/_/g, '')
    }
    if (num.endsWith('n')) {
      const without_n = num.slice(0, -1)
      const allow_e = re_hex_number.test(without_n)
      const valid = parse_js_number(without_n, allow_e)
      if (!has_dot && re_big_int.test(num) && !isNaN(valid)) return token('big_int', without_n)
      pr('bad or unexpected token')
    }
    const valid = parse_js_number(num)
    if (!isNaN(valid)) {
      return token('num', valid)
    } else {
      pr('bad syntax: ' + num)
    }
  }

  function is_octal (char) {
    return char >= '0' && char <= '7'
  }

  function read_escaped_char (in_string, strict_hex, template_string) {
    const char = next(true, in_string)
    switch (char.charCodeAt(0)) {
      case 10: return ''
      case 13:
        if (peek() == '\n') {
          next(true, in_string)
          return ''
        }
      case 98: return '\b'
      case 102: return '\f'
      case 110: return '\n'
      case 114: return '\r'
      case 116: return '\t'
      case 118: return '\u000b'
      case 117:
        if (peek() == '{') {
          next(true)
          if (peek() == '}') pr('expected hex character between {}')
          while (peek() == '0') next(true)
          const length = find('}', true) - scope.pos
          let result
          if (length > 6 || (result = hex_bytes(length, strict_hex)) > 0x10FFFF) {pr('out of bounds')}
          next(true)
          return from_char_code(result)
        }
        return String.fromCharCode(hex_bytes(4, strict_hex))
      case 120: return String.fromCharCode(hex_bytes(2, strict_hex))
    }
    if (is_octal(char)) {
      if (template_string && strict_hex) {
        const represents_null_character = char == '0' && !is_octal(peek())
        if (!represents_null_character) pr('octal escapes not allowed in templates')
      }
      return read_octal(char, strict_hex)
    }
    return char
  }

  function read_octal (char) {
    let p = peek()
    if (p >= '0' && p <= '7') {
      char += next(true)
      if (char[0] <= '3' && (p = peek()) >= '0' && p <= '7') char += next(true)
    }
    if (char == '0') return '\0'
    return String.fromCharCode(parseInt(char, 8))
  }

  function hex_bytes (n, strict_hex) {
    let num = 0, digit
    for (; n > 0; --n) {
      if (!strict_hex && isNaN(parseInt(peek(), 16))) return parseInt(num, 16) || ''
      digit = next(true)
      if (isNaN(parseInt(digit, 16))) pr('bad hex-character pattern in string')
      num += digit
    }
    return parseInt(num, 16)
  }

  function read_string () {
    const start_pos = scope.pos, quote = next(), result = []
    let char
    while (true) {
      char = next(true, true)
      if (char == '\\') {
        char = read_escaped_char(true, true)
      } else if (char == '\r' || char == '\n') {
        pr('unterminated string constant')
      } else if (char == quote){
        break
      }
      result.push(char)
    }
    const tok = token('string', result.join(''))
    latest_raw = scope.text.slice(start_pos, scope.pos)
    tok.set_quote(quote)
    return tok
  }

  function read_template_characters (begin) {
    if (begin) scope.template_braces.push(scope.brace_counter)
    let content = '', raw = '', char, tok, tmp, prev_is_tag
    next(true, true)
    while ((char = next(true, true)) != '`') {
      if (char == '\r') {
        if (peek() == '\n') ++scope.pos
        char = '\n'
      } else if (char == '$' && peek() == '{') {
        next(true, true)
        scope.brace_counter++
        tok = token(begin ? 'template_head': 'template_substitution', content)
        template_raws.set(tok, raw)
        tok.set_template_end(false)
        return tok
      }
      raw += char
      if (char == '\\') {
        tmp = scope.pos
        prev_is_tag = previous_token && (previous_token.type == 'name' || previous_token.type == 'punc' && (previous_token.value == ')' || previous_token.value == ']'))
        char = read_escaped_char(true, !prev_is_tag, true)
        raw += scope.text.substr(tmp, scope.pos - tmp)
      }
      content += char
    }
    scope.template_braces.pop()
    tok = token(begin ? 'template_head': 'template_substitution', content)
    template_raws.set(tok, raw)
    tok.set_template_end(true)
    return tok
  }

  function skip_line_comment (type) {
    const regex_allowed = scope.regex_allowed, i = find_eol()
    let result
    if (i == -1) {
      result = scope.text.substr(scope.pos)
      scope.pos = scope.text.length
    } else {
      result = scope.text.substring(scope.pos, i)
      scope.pos = i
    }
    scope.col = scope.tokcol + (scope.pos - scope.tokpos)
    scope.comments_before.push(token(type, result, true))
    scope.regex_allowed = regex_allowed
    return next_token
  }

  function skip_multiline_comment () {
    const regex_allowed = scope.regex_allowed, i = find('*/', true)
    const text = scope.text.substring(scope.pos, i).replace(/\r\n|\r|\u2028|\u2029/g, '\n')
    forward(get_full_char_length(text) + 2)
    scope.comments_before.push(token('comment2', text, true))
    scope.newline_before = scope.newline_before || member('\n', text)
    scope.regex_allowed = regex_allowed
    return next_token
  }

  function read_name () {
    const name = []
    let escaped = false, char
    function read_escaped_identifier_char () {
      escaped = true
      next()
      if (peek() !== 'u') pr('expected unicode escape sequence uXXXX or u{XXXX}')
      return read_escaped_char(false, true)
    }
    if ((char = peek()) == '\\') {
      char = read_escaped_identifier_char()
      if (!is_identifier_start(char)) pr('bad first identifier char')
    } else if (is_identifier_start(char)) {
      next()
    } else {
      return ''
    }
    name.push(char)
    while ((char = peek()) != null) {
      if ((char = peek()) == '\\') {
        char = read_escaped_identifier_char()
        if (!is_identifier_char(char)) pr('bad escaped identifier char')
      } else {
        if (!is_identifier_char(char)) break
        next()
      }
      name.push(char)
    }
    const name_str = name.join('')
    if (reserved_words.has(name_str) && escaped) pr('no escaped chars for keywords')
    return name_str
  }

  function read_regexp (source) {
    let prev_backslash = false, in_class = false, char
    while ((char = next(true))) {
      if (newline_chars.has(char)) {
        pr('unexpected line terminator')
      } else if (prev_backslash) {
        source += /^[\u0000-\u007F]$/.test(char) ? '\\' + char : char
        prev_backslash = false
      } else if (char == '[') {
        in_class = true
        source += char
      } else if (char == ']' && in_class) {
        in_class = false
        source += char
      } else if (char == '/' && !in_class) {
        break
      } else if (char == '\\') {
        prev_backslash = true
      } else {
        source += char
      }
    }
    const flags = read_name()
    return token('regexp', '/' + source + '/' + flags)
  }

  function read_operator (prefix) {
    function grow (op) {
      if (!peek()) return op
      const bigger = op + peek()
      if (operators.has(bigger)) {
        next()
        return grow(bigger)
      } else {
        return op
      }
    }
    return token('operator', grow(prefix || next()))
  }

  function handle_slash () {
    next()
    switch (peek()) {
      case '/':
        next()
        return skip_line_comment('comment1')
      case '*':
        next()
        return skip_multiline_comment()
    }
    return scope.regex_allowed ? read_regexp('') : read_operator('/')
  }

  function handle_eq_sign () {
    next()
    if (peek() == '>') {
      next()
      return token('arrow', '=>')
    } else {
      return read_operator('=')
    }
  }

  function handle_dot () {
    next()
    if (is_digit(peek().charCodeAt(0))) return read_num('.')
    if (peek() == '.') {
      next()
      next()
      return token('expand', '...')
    }
    return token('punc', '.')
  }

  function read_word () {
    const word = read_name()
    if (prev_was_dot) return token('name', word)
    return keywords_atom.has(word) ? token('atom', word) : !keywords.has(word) ? token('name', word)
      : operators.has(word) ? token('operator', word) : token('keyword', word)
  }

  function read_private_word () {
    next()
    return token('privatename', read_name())
  }

  function next_token (force_regexp) {
    if (force_regexp != null) return read_regexp(force_regexp)
    if (shebang && scope.pos == 0 && looking_at('#!')) {
      start_token()
      forward(2)
      skip_line_comment('comment5')
    }
    let char, code, tok
    while (true) {
      skip_whitespace()
      start_token()
      if (comments) {
        if (looking_at('<!--')) {
          forward(4)
          skip_line_comment('comment3')
          continue
        }
        if (looking_at('-->') && scope.newline_before) {
          forward(3)
          skip_line_comment('comment4')
          continue
        }
      }
      char = peek()
      if (!char) return token('eof')
      code = char.charCodeAt(0)
      switch (code) {
        case 34: case 39: return read_string()
        case 46: return handle_dot()
        case 47: {
          tok = handle_slash()
          if (tok === next_token) continue
          return tok
        }
        case 61: return handle_eq_sign()
        case 63: {
          if (!is_option_chain_op()) break
          next()
          next()
          return token('punc', '?.')
        }
        case 96: return read_template_characters(true)
        case 123:
          scope.brace_counter++
          break
        case 125:
          scope.brace_counter--
          if (scope.template_braces.length > 0 && scope.template_braces[scope.template_braces.length - 1] === scope.brace_counter) {
            return read_template_characters(false)
          }
          break
      }
      if (is_digit(code)) return read_num()
      if (punc_chars.has(char)) return token('punc', next())
      if (operator_chars.has(char)) return read_operator()
      if (code == 92 || is_identifier_start(char)) return read_word()
      if (code == 35) return read_private_word()
      break
    }
    pr('unexpected character' + char)
  }

  next_token.next = next
  next_token.peek = peek
  next_token.context = function (nc) {
    if (nc) scope = nc
    return scope
  }
  next_token.add_directive = function (directive) {
    scope.directive_stack[scope.directive_stack.length - 1].push(directive)
    scope.directives[directive] === undefined ? scope.directives[directive] = 1 : scope.directives[directive]++
  }
  next_token.push_directives_stack = function () {
    scope.directive_stack.push([])
  }
  next_token.pop_directives_stack = function () {
    const directives = scope.directive_stack[scope.directive_stack.length - 1]
    for (let i = 0, len = directives.length; i < len; i++) {
      scope.directives[directives[i]]--
    }
    scope.directive_stack.pop()
  }
  next_token.has_directive = function (directive) {
    return scope.directives[directive] > 0
  }
  return next_token
}

const UNARY_PREFIX = make_set([ 'typeof', 'void', 'delete', '--', '++', '!', '~', '-', '+' ])
const UNARY_POSTFIX = make_set([ '--', '++' ])
const assignment = make_set([ '=', '+=', '-=', '??=', '&&=', '||=', '/=', '*=', '**=', '%=', '>>=', '<<=', '>>>=', '|=', '^=', '&=' ])
const logical_asignment = make_set([ '??=', '&&=', '||=' ])

function set_precedence (a, result) {
  let i, b
  for (i = 0; i < a.length; ++i) {
    for (b of a[i]) {
      result[b] = i + 1
    }
  }
  return result
}
const precedence = set_precedence([['||'], ['??'], ['&&'], ['|'], ['^'], ['&'], ['==', '===', '!=', '!=='],
    ['<', '>', '<=', '>=', 'in', 'instanceof'], ['>>', '<<', '>>>'], ['+', '-'], ['*', '/', '%'], ['**'] ], {})

const atom_token = make_set([ 'atom', 'num', 'big_int', 'string', 'regexp', 'name'])

function resolve (file, folder) {
  file = file.split('/').slice(0, -folder.indexOf('/')).join('/') + '/' + folder.split('./')[1]
  if (file.slice(-3) !== '.js') file = file + '.js'
  return file
}

function parse (text, options) {
  const comments_before = new WeakMap()
  options = defaults(options, {'bare_returns': false, 'expr': false, 'file': null,
    'comments': true, 'module': false, 'shebang': true, 'strict': false, 'toplevel': null})
  let file = '', imports = {}
  if (options.toplevel) {
    if (options.toplevel.file) file = options.toplevel.file
    if (options.toplevel.imports) imports = options.toplevel.imports
  }
  options.file = file
  const scope = {input: (typeof text == 'string' ? tokenizer(text, file, options.comments, options.shebang) : text), token: null,
    prev: null, peeked: null, in_function: 0, in_async: -1, in_generator: -1, in_directives: true, in_loop: 0, labels: []}
  scope.token = next()
  function is (type, value) { return is_token(scope.token, type, value) }
  function peek () { return scope.peeked || (scope.peeked = scope.input()) }
  function next () {
    scope.prev = scope.token
    if (!scope.peeked) peek()
    scope.token = scope.peeked
    scope.peeked = null
    scope.in_directives = scope.in_directives && (scope.token.type == 'string' || is('punc', ';'))
    return scope.token
  }
  function prev () { return scope.prev }
  function cr (msg, line, col, pos) {
    const ctx = scope.input.context()
    js_error(msg, ctx.file, line != null ? line : ctx.tokline, col != null ? col : ctx.tokcol, pos != null ? pos : ctx.tokpos)
  }
  function tr (token, msg) { cr(msg, token.line, token.col) }
  function unexpected (token) {
    if (token == null) token = scope.token
    tr(token, 'Unexpected token: ' + token.type + ' (' + token.value + ')')
  }
  function expect_token (type, val) {
    if (is(type, val)) return next()
    tr(scope.token, 'Unexpected token ' + scope.token.type + ' «' + scope.token.value + '», expected ' + type + ' «' + val + '»')
  }
  function expect (punc) { return expect_token('punc', punc) }
  function has_newline_before (token) {
    return token.nlb() || !token.comments_before.every((comment) => !comment.nlb())
  }
  function can_insert_semicolon () {
    return !options.strict && (is('eof') || is('punc', '}') || has_newline_before(scope.token))
  }
  function is_in_generator () {
    return scope.in_generator === scope.in_function
  }
  function is_in_async () {
    return scope.in_async === scope.in_function
  }
  function can_await () {
    return scope.in_async === scope.in_function
  }
  function semicolon (optional) {
    if (is('punc', ';')) next()
    else if (!optional && !can_insert_semicolon()) unexpected()
  }
  function parenthesised () {
    expect('(')
    const expr = expression(true)
    expect(')')
    return expr
  }

  function embed_tokens (parser) {
    return function _embed_tokens_wrapper (...args) {
      const start = scope.token
      const expr = parser(...args)
      expr.start = start
      expr.end = prev()
      return expr
    }
  }

  function handle_regexp () {
    if (is('operator', '/') || is('operator', '/=')) {
      scope.peeked = null
      scope.token = scope.input(scope.token.value.substr(1))
    }
  }

  function in_loop (cont) {
    ++scope.in_loop
    const result = cont()
    --scope.in_loop
    return result
  }

  const statement = embed_tokens(function statement (is_export_default, is_for_body, is_if_body) {
    handle_regexp()
    let root, value
    switch (scope.token.type) {
      case 'string':
        if (scope.in_directives) {
          const token = peek()
          if (!member('\\', latest_raw) && (is_token(token, 'punc', ';') || is_token(token, 'punc', '}')
              || has_newline_before(token) || is_token(token, 'eof'))) {
            scope.input.add_directive(scope.token.value)
          } else {
            scope.in_directives = false
          }
        }
        const dir = scope.in_directives, stat = simple_statement()
        return dir && stat.body instanceof ast_string ? new ast_directive(stat.body) : stat
      case 'template_head': case 'num': case 'big_int': case 'regexp': case 'operator': case 'atom':
        return simple_statement()
      case 'name': case 'pr iivatename':
        if (is('privatename') && !scope.in_class) cr('private field must be used in an enclosing class')
        if (scope.token.value == 'async' && is_token(peek(), 'keyword', 'function')) {
          next()
          next()
          if (is_for_body) cr('functions are not allowed as the body of a loop')
          return function_(ast_defun, false, true, is_export_default)
        }
        if (scope.token.value == 'import' && !is_token(peek(), 'punc', '(') && !is_token(peek(), 'punc', '.')) {
          next()
          root = import_statement()
          semicolon()
          return root
        }
        return is_token(peek(), 'punc', ':') ? labeled_statement() : simple_statement()
      case 'punc':
        switch (scope.token.value) {
          case '{':
            return new ast_block_statement({start: scope.token, body: block_(), end: prev(), file})
          case '[': case '(':
            return simple_statement()
          case ';':
            scope.in_directives = false
            next()
            return new ast_empty_statement()
          default:
            unexpected()
        }
      case 'keyword':
        switch (scope.token.value) {
          case 'break':
            next()
            return break_cont(ast_break)
          case 'continue':
            next()
            return break_cont(ast_continue)
          case 'debugger':
            next()
            semicolon()
            return new ast_debugger()
          case 'do':
            next()
            const body = in_loop(statement)
            expect_token('keyword', 'while')
            const condition = parenthesised()
            semicolon(true)
            return new ast_do({body, condition})
          case 'while':
            next()
            return new ast_while({condition: parenthesised(), body: in_loop(function () { return statement(false, true) }) })
          case 'for':
            next()
            return for_()
          case 'class':
            next()
            if (is_for_body) cr('classes cannot be body of a loop')
            if (is_if_body) cr('classes cannot be body of an if')
            return class_(ast_def_class, is_export_default)
          case 'function':
            next()
            if (is_for_body) cr('functions cannot be body of a loop')
            return function_(ast_defun, false, false, is_export_default)
          case 'if':
            next()
            return if_()
          case 'return':
            if (scope.in_function == 0 && !options.bare_returns) cr('return outside of function')
            next()
            value = null
            if (is('punc', ';')) {
              next()
            } else if (!can_insert_semicolon()) {
              value = expression(true)
              semicolon()
            }
            return new ast_return({value})
          case 'switch':
            next()
            return new ast_switch({
              expr: parenthesised(),
              body: in_loop(switch_body_)
            })
          case 'throw':
            next()
            if (has_newline_before(scope.token)) cr('bad newline after throw')
            value = expression(true)
            semicolon()
            return new ast_throw({value})
          case 'try':
            next()
            return try_()
          case 'var':
            next()
            root = var_()
            semicolon()
            return root
          case 'let':
            next()
            root = let_()
            semicolon()
            return root
          case 'const':
            next()
            root = const_()
            semicolon()
            return root
          case 'with':
            next()
            return new ast_with({expr: parenthesised(), body: statement() })
          case 'export':
            if (!is_token(peek(), 'punc', '(')) {
              next()
              root = export_statement()
              if (is('punc', ';')) semicolon()
              return root
            }
        }
    }
    unexpected()
  })

  function labeled_statement () {
    const label = as_symbol(ast_label)
    if (label.name == 'await' && is_in_async()) tr(scope.prev, 'await cannot be async function label')
    if (scope.labels.some((l) => l.name === label.name)) cr('duplicate label ' + label.name)
    expect(':')
    scope.labels.push(label)
    const stat = statement()
    scope.labels.pop()
    if (!(stat instanceof ast_iteration_statement) && label.references) {
      label.references.forEach(function (ref) {
        if (ref instanceof ast_continue) {
          ref = ref.label.start
          cr('continue ' + label.name + ' refers to non iter statement', ref.line, ref.col, ref.pos)
        }
      })
    }
    return new ast_labeled_statement({body: stat, label})
  }

  function simple_statement (tmp) {
    return new ast_statement({body: (tmp = expression(true), semicolon(), tmp) })
  }

  function break_cont (type) {
    let label = null, ldef
    if (!can_insert_semicolon()) label = as_symbol(ast_label_ref, true)
    if (label != null) {
      ldef = scope.labels.find((l) => l.name === label.name)
      if (!ldef) cr('undefined label ' + label.name)
      label.thedef = ldef
    } else if (scope.in_loop == 0) {
      cr(type.type + ' not inside a loop or switch')
    }
    semicolon()
    const stat = new type({label})
    if (ldef && ldef.references) ldef.references.push(stat)
    return stat
  }

  function for_ () {
    let await_tok = scope.token, init = null
    if (await_tok.type == 'name' && await_tok.value == 'await') {
      if (!can_await()) tr(await_tok, 'bad for await')
      next()
    } else {
      await_tok = false
    }
    expect('(')
    if (!is('punc', ';')) {
      init = is('keyword', 'var') ? (next(), var_(true)) :
        is('keyword', 'let') ? (next(), let_(true)) :
        is('keyword', 'const') ? (next(), const_(true)) : expression(true, true)
      const is_in = is('operator', 'in'), is_of = is('name', 'of')
      if (await_tok && !is_of) tr(await_tok, 'bad for await')
      if (is_in || is_of) {
        if (init instanceof ast_definitions) {
          if (init.defs.length > 1) tr(init.start, 'Only one variable declaration allowed in for..in loop')
        } else if (!(is_assignable(init) || (init = to_destructure(init)) instanceof ast_destructure)) {
          tr(init.start, 'bad left-hand side in for..in loop')
        }
        next()
        return is_in ? for_in(init) : for_of(init, !!await_tok)
      }
    } else if (await_tok) {
      tr(await_tok, for_await_error)
    }
    return regular_for(init)
  }

  function regular_for (init) {
    expect(';')
    const condition = is('punc', ';') ? null : expression(true)
    expect(';')
    const step = is('punc', ')') ? null : expression(true)
    expect(')')
    return new ast_for({init, condition, step, body: in_loop(function () { return statement(false, true) })})
  }

  function for_of (init, is_await) {
    const name = init instanceof ast_definitions ? init.defs[0].name : null, object = expression(true)
    expect(')')
    return new ast_for_of({is_await, init, name, object, body: in_loop(function () { return statement(false, true)})})
  }

  function for_in (init) {
    const object = expression(true)
    expect(')')
    return new ast_for_in({init, object, body: in_loop(function () { return statement(false, true) })})
  }

  function arrow_function (start, argnames, sync) {
    if (has_newline_before(scope.token)) cr('Unexpected newline before arrow (=>)')
    expect_token('arrow', '=>')
    const body = _function_body(is('punc', '{'), false, sync)
    const end = body instanceof Array && body.length ? body[body.length - 1].end : body instanceof Array ? start : body.end
    return new ast_arrow({start, end, file, sync, argnames, body})
  }

  function function_ (ctor, is_generator_property, sync, is_export_default) {
    const in_statement = ctor === ast_defun, gen = is('operator', '*')
    if (gen) next()
    const name = is('name') ? as_symbol(in_statement ? ast_symbol_defun: ast_symbol_lambda) : null
    if (in_statement && !name) is_export_default ? ctor = ast_function : unexpected()
    if (name && ctor !== ast_accessor && !(name instanceof ast_declaration)) unexpected(prev())
    const argnames = []
    const body = _function_body(true, gen || is_generator_property, sync, name, argnames)
    return new ctor({start: argnames.start, end: body.end, file, gen, sync, name, argnames, body})
  }

  class used_parameters {
    constructor (is_parameter, duplicates_ok = false) {
      this.is_parameter = is_parameter
      this.duplicates_ok = duplicates_ok
      this.parameters = new Set()
      this.duplicate = null
      this.default_assignment = false
      this.spread = false
    }
    add_parameter (token) {
      if (this.parameters.has(token.value)) {
        if (this.duplicate === null) this.duplicate = token
        this.check_strict()
      } else {
        this.parameters.add(token.value)
        if (this.is_parameter) {
          switch (token.value) {
            case 'arguments':
            case 'eval':
            case 'yield': break
            default: if (reserved_words.has(token.value)) unexpected()
          }
        }
      }
    }
    mark_default_assignment (token) {
      if (this.default_assignment === false) this.default_assignment = token
    }
    mark_spread (token) {
      if (this.spread === false) this.spread = token
    }
    mark_strict_mode () {
      this.strict_mode = true
    }
    is_strict () {
      return this.default_assignment !== false || this.spread !== false || this.strict_mode
    }
    check_strict () {
      if (this.is_strict() && this.duplicate !== null && !this.duplicates_ok) {
        tr(this.duplicate, 'Parameter ' + this.duplicate.value + ' was used already')
      }
    }
  }

  function parameters (params) {
    const used = new used_parameters(true)
    expect('(')
    let param
    while (!is('punc', ')')) {
      param = parameter(used)
      params.push(param)
      if (!is('punc', ')')) expect(',')
      if (param instanceof ast_spread) break
    }
    next()
  }

  function parameter (used, symbol_type) {
    let expand = false, param
    if (used === undefined) used = new used_parameters(true)
    if (is('expand', '...')) {
      expand = scope.token
      used.mark_spread(scope.token)
      next()
    }
    param = binding_element(used, symbol_type)
    if (is('operator', '=') && expand === false) {
      used.mark_default_assignment(scope.token)
      next()
      param = new ast_default_assign({start: param.start, left: param, operator: '=',
        right: expression(false), end: scope.token, file})
    }

    if (expand !== false) {
      if (!is('punc', ')')) unexpected()
      param = new ast_spread({start: expand, expr: param, end: expand, file})
    }
    used.check_strict()
    return param
  }

  function binding_element (used, symbol_type) {
    const elements = [], start = scope.token
    let first = true, is_expand = false, expand_token
    if (used === undefined) used = new used_parameters(false, symbol_type === ast_symbol_var)
    symbol_type = symbol_type === undefined ? ast_symbol_funarg : symbol_type
    if (is('punc', '[')) {
      next()
      while (!is('punc', ']')) {
        first ? first = false : expect(',')
        if (is('expand', '...')) {
          is_expand = true
          expand_token = scope.token
          used.mark_spread(scope.token)
          next()
        }
        if (is('punc')) {
          switch (scope.token.value) {
            case ',':
              elements.push(new ast_hole({start: scope.token, end: scope.token, file}))
              continue
            case ']':
              break
            case '[': case '{':
              elements.push(binding_element(used, symbol_type))
              break
            default:
              unexpected()
          }
        } else if (is('name')) {
          used.add_parameter(scope.token)
          elements.push(as_symbol(symbol_type))
        } else {
          cr('bad function parameter')
        }
        if (is('operator', '=') && is_expand === false) {
          used.mark_default_assignment(scope.token)
          next()
          elements[elements.length - 1] = new ast_default_assign({
            start: elements[elements.length - 1].start, left: elements[elements.length - 1],
            operator: '=', right: expression(false), end: scope.token, file})
        }
        if (is_expand) {
          if (!is('punc', ']')) cr('rest element must be last element')
          elements[elements.length - 1] = new ast_spread({
            start: expand_token, expr: elements[elements.length - 1], end: expand_token, file})
        }
      }
      expect(']')
      used.check_strict()
      return new ast_destructure({start, names: elements, is_array: true, end: prev(), file})
    } else if (is('punc', '{')) {
      next()
      while (!is('punc', '}')) {
        first ? first = false : expect(',')
        if (is('expand', '...')) {
          is_expand = true
          expand_token = scope.token
          used.mark_spread(scope.token)
          next()
        }
        if (is('name') && (is_token(peek(), 'punc') || is_token(peek(), 'operator')) && member(peek().value, [',', '}', '='])) {
          used.add_parameter(scope.token)
          const start = prev(), value = as_symbol(symbol_type)
          if (is_expand) {
            elements.push(new ast_spread({start: expand_token, expr: value, end: value.end, file}))
          } else {
            elements.push(new ast_key_value({start, key: value.name, value, end: value.end, file}))
          }
        } else if (is('punc', '}')) {
          continue
        } else {
          const property_token = scope.token, property = as_property_name()
          if (property === null) {
            unexpected(prev())
          } else if (prev().type == 'name' && !is('punc', ':')) {
            elements.push(new ast_key_value({start: prev(), key: property,
              value: new symbol_type({start: prev(), name: property, end: prev(), file}), end: prev(), file}))
          } else {
            expect(':')
            elements.push(new ast_key_value({start: property_token, quote: property_token.quote, key: property,
              value: binding_element(used, symbol_type), end: prev(), file}))
          }
        }
        if (is_expand) {
          if (!is('punc', '}')) cr('Rest element must be last element')
        } else if (is('operator', '=')) {
          used.mark_default_assignment(scope.token)
          next()
          elements[elements.length - 1].value = new ast_default_assign({
            start: elements[elements.length - 1].value.start, left: elements[elements.length - 1].value,
            operator: '=', right: expression(false), end: scope.token, file})
        }
      }
      expect('}')
      used.check_strict()
      return new ast_destructure({start, names: elements, is_array: false, end: prev(), file})
    } else if (is('name')) {
      used.add_parameter(scope.token)
      return as_symbol(symbol_type)
    } else {
      cr('bad function parameter')
    }
  }

  function params_or_seq_ (allow_arrows, maybe_sequence) {
    const a = []
    let bad_sequence, spread_token, trailing_comma
    expect('(')
    while (!is('punc', ')')) {
      if (spread_token) unexpected(spread_token)
      if (is('expand', '...')) {
        spread_token = scope.token
        if (maybe_sequence) bad_sequence = scope.token
        next()
        a.push(new ast_spread({start: prev(), expr: expression(), end: scope.token, file}))
      } else {
        a.push(expression())
      }
      if (!is('punc', ')')) {
        expect(',')
        if (is('punc', ')')) {
          trailing_comma = prev()
          if (maybe_sequence) bad_sequence = trailing_comma
        }
      }
    }
    expect(')')
    if (allow_arrows && is('arrow', '=>')) {
      if (spread_token && trailing_comma) unexpected(trailing_comma)
    } else if (bad_sequence) {
      unexpected(bad_sequence)
    }
    return a
  }

  function _function_body (block, generator, sync, name, args) {
    const loop = scope.in_loop, labels = scope.labels, current_generator = scope.in_generator, current_async = scope.in_async
    ++scope.in_function
    if (generator) scope.in_generator = scope.in_function
    if (sync) scope.in_async = scope.in_function
    if (args) parameters(args)
    if (block) scope.in_directives = true
    scope.in_loop = 0
    scope.labels = []
    let a
    if (block) {
      scope.input.push_directives_stack()
      a = block_()
      if (name) _verify_symbol(name)
      if (args) args.forEach(_verify_symbol)
      scope.input.pop_directives_stack()
    } else {
      a = [new ast_return({start: scope.token, value: expression(false), end: scope.token, file})]
    }
    --scope.in_function
    scope.in_loop = loop
    scope.labels = labels
    scope.in_generator = current_generator
    scope.in_async = current_async
    return a
  }

  function _await_expression () {
    if (!can_await()) cr('await outside async', scope.prev.line, scope.prev.col, scope.prev.pos)
    return new ast_await({start: prev(), end: scope.token, file, expr: maybe_unary(true) })
  }

  function _yield_expression () {
    if (!is_in_generator()) cr('yield outside generator', scope.prev.line, scope.prev.col, scope.prev.pos)
    const start = scope.token
    let has_expression = true, star = false
    if (can_insert_semicolon() || (is('punc') && punc_after_expression.has(scope.token.value))) {
      has_expression = false
    } else if (is('operator', '*')) {
      star = true
      next()
    }
    return new ast_yield({start, star, expr: has_expression ? expression() : null, end: prev(), file})
  }

  function if_ () {
    const condition = parenthesised(), body = statement(false, false, true)
    let alt = null
    if (is('keyword', 'else')) {
      next()
      alt = statement(false, false, true)
    }
    return new ast_if({condition, body, alt})
  }

  function block_ () {
    expect('{')
    const a = []
    while (!is('punc', '}')) {
      if (is('eof')) unexpected()
      a.push(statement())
    }
    next()
    return a
  }

  function switch_body_ () {
    expect('{')
    const a = []
    let cur = null, branch = null, tmp
    while (!is('punc', '}')) {
      if (is('eof')) unexpected()
      if (is('keyword', 'case')) {
        if (branch) branch.end = prev()
        cur = []
        branch = new ast_case({start: (tmp = scope.token, next(), tmp), expr: expression(true), body: cur})
        a.push(branch)
        expect(':')
      } else if (is('keyword', 'default')) {
        if (branch) branch.end = prev()
        cur = []
        branch = new ast_default({start: (tmp = scope.token, next(), expect(':'), tmp), body: cur})
        a.push(branch)
      } else {
        if (!cur) unexpected()
        cur.push(statement())
      }
    }
    if (branch) branch.end = prev()
    next()
    return a
  }

  function try_ () {
    const body = new ast_try_block({start: scope.token, body: block_(), end: prev(), file})
    let bcatch = null, bfinally = null, start, name
    if (is('keyword', 'catch')) {
      start = scope.token
      next()
      if (is('punc', '{')) {
        name = null
      } else {
        expect('(')
        name = parameter(undefined, ast_symbol_catch)
        expect(')')
      }
      bcatch = new ast_catch({start, argname: name, body: block_(), end: prev(), file})
    }
    if (is('keyword', 'finally')) {
      start = scope.token
      next()
      bfinally = new ast_finally({start, body: block_(), end: prev(), file})
    }
    if (!bcatch && !bfinally) cr('Missing catch/finally blocks')
    return new ast_try({body, bcatch, bfinally})
  }

  function vardefs (no_in, kind) {
    const defs = []
    let defined, sym_type
    while (true) {
      sym_type = kind == 'var' ? ast_symbol_var : kind == 'const' ? ast_symbol_const : kind == 'let' ? ast_symbol_let : null
      if (is('punc', '{') || is('punc', '[')) {
        defined = new ast_var_def({start: scope.token, name: binding_element(undefined, sym_type), value: is('operator', '=')
          ? (expect_token('operator', '='), expression(false, no_in)) : null, end: prev(), file})
      } else {
        defined = new ast_var_def({start: scope.token, name: as_symbol(sym_type), value: is('operator', '=')
          ? (next(), expression(false, no_in)) : (!no_in && kind == 'const') ? cr('no const init') : null, end: prev(), file})
        if (defined.name.name == 'import') cr('Unexpected token: import')
      }
      defs.push(defined)
      if (!is('punc', ',')) break
      next()
    }
    return defs
  }

  function var_ (no_in) {
    return new ast_var({start: prev(), defs: vardefs(no_in, 'var'), end: prev(), file})
  }

  function let_ (no_in) {
    return new ast_let({start: prev(), defs: vardefs(no_in, 'let'), end: prev(), file})
  }

  function const_ (no_in) {
    return new ast_const({start: prev(), defs: vardefs(no_in, 'const'), end: prev(), file})
  }

  function new_ (allow_calls) {
    const start = scope.token
    expect_token('operator', 'new')
    if (is('punc', '.')) {
      next()
      expect_token('name', 'target')
      return subscripts(new ast_new_target({start, end: prev(), file}), allow_calls)
    }
    const expr = expr_atom(false)
    let args
    if (is('punc', '(')) {
      next()
      args = expr_list(')', true)
    } else {
      args = []
    }
    const call = new ast_new({start, expr, args, end: prev(), file})
    annotate(call)
    return subscripts(call, allow_calls)
  }

  function as_atom_node () {
    const tok = scope.token
    let result
    switch (tok.type) {
      case 'name':
        result = _make_symbol(ast_symbol_ref)
        break
      case 'num':
        result = new ast_number({start: tok, end: tok, file, value: tok.value, raw: latest_raw})
        break
      case 'big_int':
        result = new ast_big_int({start: tok, end: tok, file, value: tok.value})
        break
      case 'string':
        result = new ast_string({start: tok, end: tok, file, value: tok.value, quote: tok.quote})
        annotate(result)
        break
      case 'regexp':
        const [_, source, flags] = tok.value.match(/^\/(.*)\/(\w*)$/)
        result = new ast_reg_exp({start: tok, end: tok, file, value: {source, flags}})
        break
      case 'atom':
        switch (tok.value) {
            case 'false':
              result = new ast_false({start: tok, end: tok, file})
              break
            case 'true':
              result = new ast_true({start: tok, end: tok, file})
              break
            case 'null':
              result = new ast_null({start: tok, end: tok, file})
              break
        }
        break
    }
    next()
    return result
  }

  function to_fun_args (expr, above) {
    function insert_default (expr, default_value) {
      if (default_value) return new ast_default_assign({start: expr.start, left: expr, operator: '=', right: default_value, end: default_value.end, file})
      return expr
    }
    if (expr instanceof ast_object) {
      return insert_default(new ast_destructure({start: expr.start, is_array: false,
        names: expr.properties.map(prop => to_fun_args(prop)), end: expr.end, file}), above)
    } else if (expr instanceof ast_key_value) {
      expr.value = to_fun_args(expr.value)
      return insert_default(expr, above)
    } else if (expr instanceof ast_hole) {
      return expr
    } else if (expr instanceof ast_destructure) {
      expr.names = expr.names.map(name => to_fun_args(name))
      return insert_default(expr, above)
    } else if (expr instanceof ast_symbol_ref) {
      return insert_default(new ast_symbol_funarg({name: expr.name, start: expr.start, end: expr.end, file}), above)
    } else if (expr instanceof ast_spread) {
      expr.expr = to_fun_args(expr.expr)
      return insert_default(expr, above)
    } else if (expr instanceof ast_array) {
      return insert_default(new ast_destructure({start: expr.start, is_array: true,
        names: expr.elements.map(elm => to_fun_args(elm)), end: expr.end, file}), above)
    } else if (expr instanceof ast_assign) {
      return insert_default(to_fun_args(expr.left, expr.right), above)
    } else if (expr instanceof ast_default_assign) {
      expr.left = to_fun_args(expr.left)
      return expr
    } else {
      cr('bad function parameter', expr.start.line, expr.start.col)
    }
  }

  function expr_atom (allow_calls, allow_arrows) {
    if (is('operator', 'new')) return new_(allow_calls)
    if (is('name', 'import') && is_token(peek(), 'punc', '.')) return import_meta(allow_calls)
    const start = scope.token
    let peeked
    const async = is('name', 'async') && (peeked = peek()).value != '[' && peeked.type != 'arrow' && as_atom_node()
    if (is('punc')) {
      switch (scope.token.value) {
        case '(':
          if (async && !allow_calls) break
          const exprs = params_or_seq_(allow_arrows, !async)
          if (allow_arrows && is('arrow', '=>')) return arrow_function(start, exprs.map(expr => to_fun_args(expr)), !!async)
          const expr = async ? new ast_call({expr: async, args: exprs}) : to_expr_or_sequence(start, exprs)
          if (expr.start) {
            const outer_comments_before = start.comments_before.length
            comments_before.set(start, outer_comments_before)
            expr.start.comments_before.unshift(...start.comments_before)
            start.comments_before = expr.start.comments_before
            if (outer_comments_before == 0 && start.comments_before.length > 0) {
              const comment = start.comments_before[0]
              if (!comment.nlb()) {
                comment.set_nlb(start.nlb())
                start.set_nlb(false)
              }
            }
            start.comments_after = expr.start.comments_after
          }
          expr.start = start
          const end = prev()
          if (expr.end) {
            end.comments_before = expr.end.comments_before
            expr.end.comments_after.push(...end.comments_after)
            end.comments_after = expr.end.comments_after
          }
          expr.end = end
          if (expr instanceof ast_call) annotate(expr)
          return subscripts(expr, allow_calls)
        case '[':
          return subscripts(array_(), allow_calls)
        case '{':
          return subscripts(object_or_destructure_(), allow_calls)
      }
      if (!async) unexpected()
    }
    if (allow_arrows && is('name') && is_token(peek(), 'arrow')) {
      const param = new ast_symbol_funarg({name: scope.token.value, start, end: start, file})
      next()
      return arrow_function(start, [param], !!async)
    }
    if (is('keyword', 'function')) {
      next()
      const func = function_(ast_function, false, !!async)
      func.start = start
      func.end = prev()
      return subscripts(func, allow_calls)
    }
    if (async) return subscripts(async, allow_calls)
    if (is('keyword', 'class')) {
      next()
      const cls = class_(ast_class_expression)
      cls.start = start
      cls.end = prev()
      return subscripts(cls, allow_calls)
    }
    if (is('template_head')) return subscripts(template_string(), allow_calls)
    if (atom_token.has(scope.token.type)) return subscripts(as_atom_node(), allow_calls)
    unexpected()
  }

  function template_string () {
    const segments = [], start = scope.token
    segments.push(new ast_template_segment({start: scope.token, raw: template_raws.get(scope.token),
      value: scope.token.value, end: scope.token, file}))

    while (!scope.token.template_end()) {
      next()
      handle_regexp()
      segments.push(expression(true))
      segments.push(new ast_template_segment({start: scope.token, raw: template_raws.get(scope.token),
        value: scope.token.value, end: scope.token, file}))
    }
    next()

    return new ast_template_string({start, segments: segments, end: scope.token, file})
  }

  function expr_list (closing, allow_trailing_comma, allow_empty) {
    const a = []
    let first = true
    while (!is('punc', closing)) {
      first ? first = false : expect(',')
      if (allow_trailing_comma && is('punc', closing)) break
      if (is('punc', ',') && allow_empty) {
        a.push(new ast_hole({start: scope.token, end: scope.token, file}))
      } else if (is('expand', '...')) {
        next()
        a.push(new ast_spread({start: prev(), expr: expression(), end: scope.token, file}))
      } else {
        a.push(expression(false))
      }
    }
    next()
    return a
  }

  const array_ = embed_tokens(function () {
    expect('[')
    return new ast_array({elements: expr_list(']', !options.strict, true) })
  })

  const create_accessor = embed_tokens((gen, sync) => {
    return function_(ast_accessor, gen, sync)
  })

  const object_or_destructure_ = embed_tokens(function object_or_destructure_ () {
    const a = []
    let start = scope.token, first = true
    expect('{')
    while (!is('punc', '}')) {
      first ? first = false : expect(',')
      if (!options.strict && is('punc', '}')) break
      start = scope.token
      if (start.type == 'expand') {
        next()
        a.push(new ast_spread({start, expr: expression(false), end: prev(), file}))
        continue
      }
      if (is('privatename')) cr('private fields are not allowed in an object')
      const name = as_property_name()
      let value
      if (!is('punc', ':')) {
        const concise = concise_method_or_getset(name, start)
        if (concise) {
          a.push(concise)
          continue
        }
        value = new ast_symbol_ref({start: prev(), name, end: prev(), file})
      } else if (name === null) {
        unexpected(prev())
      } else {
        next()
        value = expression(false)
      }
      if (is('operator', '=')) {
        next()
        value = new ast_assign({start, left: value, operator: '=', right: expression(false), logical: false, end: prev(), file})
      }
      a.push(annotate(new ast_key_value({start, quote: start.quote, key: name instanceof tree ? name : '' + name, value, end: prev(), file})))
    }
    next()
    return new ast_object({properties: a})
  })

  function class_ (kind, is_export_default) {
    const a = []
    let start, method, class_name, extends_
    scope.input.push_directives_stack()
    if (scope.token.type == 'name' && scope.token.value != 'extends') {
      class_name = as_symbol(kind === ast_def_class ? ast_symbol_def_class: ast_symbol_class)
    }
    if (kind === ast_def_class && !class_name) is_export_default ? kind = ast_class_expression : unexpected()
    if (scope.token.value == 'extends') {
      next()
      extends_ = expression(true)
    }
    expect('{')
    const save_in_class = scope.in_class
    scope.in_class = true
    while (is('punc', ';')) { next() }
    while (!is('punc', '}')) {
      start = scope.token
      method = concise_method_or_getset(as_property_name(), start, true)
      if (!method) unexpected()
      a.push(method)
      while (is('punc', ';')) next()
    }
    scope.in_class = save_in_class
    scope.input.pop_directives_stack()
    next()
    return new kind({start, name: class_name, extends: extends_, properties: a, end: prev(), file})
  }

  function concise_method_or_getset (name, start, is_class) {
    const get_symbol_ast = (name, SymbolClass = ast_symbol_method) => {
      if (typeof name == 'string' || typeof name == 'number') {
        return new SymbolClass({start, name: '' + name, end: prev(), file})
      } else if (name === null) {
        unexpected()
      }
      return name
    }
    const is_not_method_start = () => !is('punc', '(') && !is('punc', ',') && !is('punc', '}') && !is('punc', ';') && !is('operator', '=')
    let sync, sttc, gen, is_private, accessor_type
    if (is_class && name == 'static' && is_not_method_start()) {
      const static_block = class_static_block()
      if (static_block != null) return static_block
      sttc = true
      name = as_property_name()
    }
    if (name == 'async' && is_not_method_start()) {
      sync = true
      name = as_property_name()
    }
    if (prev().type == 'operator' && prev().value == '*') {
      gen = true
      name = as_property_name()
    }
    if ((name == 'get' || name == 'set') && is_not_method_start()) {
      accessor_type = name
      name = as_property_name()
    }
    if (prev().type == 'privatename') is_private = true
    const property_token = prev()
    if (accessor_type != null) {
      if (!is_private) {
        const AccessorClass = accessor_type == 'get' ? ast_object_getter : ast_object_setter
        name = get_symbol_ast(name)
        return annotate(new AccessorClass({start, static: sttc, key: name,
          quote: name instanceof ast_symbol_method ? property_token.quote : undefined,
          value: create_accessor(), end: prev()}))
      } else {
        const AccessorClass = accessor_type == 'get' ? ast_private_getter : ast_private_setter
        return annotate(new AccessorClass({start, static: sttc, key: get_symbol_ast(name), value: create_accessor(), end: prev()}))
      }
    }
    if (is('punc', '(')) {
      name = get_symbol_ast(name)
      const ast_method_variant = is_private ? ast_private_method : ast_concise_method
      const root = new ast_method_variant({start, static: sttc, gen, sync: sync, key: name,
        quote: name instanceof ast_symbol_method ? property_token.quote : undefined,
        value: create_accessor(gen, sync), end: prev(), file})
      return annotate(root)
    }
    if (is_class) {
      const key = get_symbol_ast(name, ast_symbol_class_property)
      const quote = key instanceof ast_symbol_class_property ? property_token.quote : undefined
      const variant = is_private ? ast_private_property : ast_class_property
      if (is('operator', '=')) {
        next()
        return annotate(new variant({start, static: sttc, quote, key, value: expression(false), end: prev(), file}))
      } else if (is('name') || is('privatename') || is('operator', '*') || is('punc', ';') || is('punc', '}')) {
        return annotate(new variant({start, static: sttc, quote, key, end: prev(), file}))
      }
    }
  }

  function class_static_block () {
    if (!is('punc', '{')) return null
    const start = scope.token
    const body = []
    next()
    while (!is('punc', '}')) body.push(statement())
    next()
    return new ast_class_static({start, body, end: prev(), file})
  }

  function maybe_import_assertion () {
    if (is('name', 'assert') && !has_newline_before(scope.token)) {
      next()
      return object_or_destructure_()
    }
    return null
  }

  function import_statement () {
    const start = prev()
    let import_name, import_names
    if (is('name')) import_name = as_symbol(ast_symbol_import)
    if (is('punc', ',')) next()
    import_names = map_names(true)
    if (import_names || import_name) expect_token('name', 'from')
    const module = scope.token
    if (module.type !== 'string') unexpected()
    next()
    const assert_clause = maybe_import_assertion()
    const resolved = resolve(file, module.value)
    if (import_name) {
      import_name.file = resolved
      imports[file + '/' + import_name.name] = resolved + '/' + import_name.name
    }
    if (import_names) import_names.forEach(i => {
      i.file = resolved
      i.foreign_name.file = resolved
      i.name.file = resolved
      imports[file + '/' + i.name.name] = resolved + '/' + i.foreign_name.name
    })
    return new ast_import({start, import_name, import_names,
      module_name: new ast_string({start: module, value: module.value, quote: module.quote, end: module, file}),
      assert_clause, end: scope.token, file})
  }

  function map_name (is_import) {
    function make_symbol (type, quote) {
      return new type({name: as_property_name(), quote: quote || undefined, start: prev(), end: prev(), file})
    }
    const foreign_type = is_import ? ast_symbol_import_foreign : ast_symbol_export_foreign
    const type = is_import ? ast_symbol_import : ast_symbol_export
    const start = scope.token
    let foreign_name, name
    is_import ? foreign_name = make_symbol(foreign_type, start.quote) : name = make_symbol(type, start.quote)
    if (is('name', 'as')) {
      next()
      is_import ? name = make_symbol(type) : foreign_name = make_symbol(foreign_type, scope.token.quote)
    } else if (is_import) {
      name = new type(foreign_name)
    } else {
      foreign_name = new foreign_type(name)
    }
    return new ast_name_mapping({start, foreign_name, name, end: prev(), file})
  }

  function map_nameAsterisk (is_import, import_name) {
    const foreign_type = is_import ? ast_symbol_import_foreign : ast_symbol_export_foreign
    const type = is_import ? ast_symbol_import: ast_symbol_export
    const start = scope.token, end = prev()
    let name, foreign_name
    is_import ? name = import_name : foreign_name = import_name
    name = name || new type({start, name: '*', end, file})
    foreign_name = foreign_name || new foreign_type({start, name: '*', end, file})
    return new ast_name_mapping({start, foreign_name, name, end, file})
  }

  function map_names (is_import) {
    let names
    if (is('punc', '{')) {
      next()
      names = []
      while (!is('punc', '}')) {
        names.push(map_name(is_import))
        if (is('punc', ',')) next()
      }
      next()
    } else if (is('operator', '*')) {
      let name
      next()
      if (is('name', 'as')) {
        next()
        name = is_import ? as_symbol(ast_symbol_import) : as_symbol_or_string(ast_symbol_export_foreign)
      }
      names = [map_nameAsterisk(is_import, name)]
    }
    return names
  }

  function export_statement () {
    const start = scope.token
    let is_default, names
    if (is('keyword', 'default')) {
      is_default = true
      next()
    } else if (names = map_names(false)) {
      if (is('name', 'from')) {
        next()
        const mod_str = scope.token
        if (mod_str.type !== 'string') unexpected()
        next()
        const assert_clause = maybe_import_assertion()
        return new ast_export({start, assert_clause, is_default, names,
          module_name: new ast_string({start: mod_str, value: mod_str.value, quote: mod_str.quote, end: mod_str, file}), end: prev(), file})
      } else {
        return new ast_export({start, is_default, names, end: prev(), file})
      }
    }
    let root, value, defined
    if (is('punc', '{') || is_default && (is('keyword', 'class') || is('keyword', 'function')) && is_token(peek(), 'punc')) {
      value = expression(false)
      semicolon()
    } else if ((root = statement(is_default)) instanceof ast_definitions && is_default) {
      unexpected(root.start)
    } else if (root instanceof ast_definitions || root instanceof ast_defun || root instanceof ast_def_class) {
      defined = root
    } else if (root instanceof ast_class_expression || root instanceof ast_function) {
      value = root
    } else if (root instanceof ast_statement) {
      value = root.body
    } else {
      unexpected(root.start)
    }
    return new ast_export({start, assert_clause: null, is_default, value, defined, end: prev(), file})
  }

  function as_property_name () {
    const tmp = scope.token
    switch (tmp.type) {
      case 'punc':
        if (tmp.value == '[') {
          next()
          const expr = expression(false)
          expect(']')
          return expr
        } else {
          unexpected(tmp)
        }
      case 'operator':
        if (tmp.value == '*') {
          next()
          return null
        }
        if (!member(tmp.value, ['delete', 'in', 'instanceof', 'new', 'typeof', 'void'])) unexpected(tmp)
      case 'name': case 'privatename': case 'string': case 'num': case 'big_int': case 'keyword': case 'atom':
        next()
        return tmp.value
      default:
        unexpected(tmp)
    }
  }

  function as_name () {
    const tmp = scope.token
    if (tmp.type != 'name' && tmp.type != 'privatename') unexpected()
    next()
    return tmp.value
  }

  function _make_symbol (type) {
    const name = scope.token.value
    return new (name == 'this' ? ast_this : name == 'super' ? ast_super : type)({
      name: String(name), start: scope.token, end: scope.token, file})
  }

  function _verify_symbol (sym) {
    if (is_in_generator() && sym.name == 'yield') tr(sym.start, 'yield cannot be identifier')
  }

  function as_symbol (type, noerror) {
    if (!is('name')) {
      if (!noerror) cr('Name expected')
      return null
    }
    const sym = _make_symbol(type)
    _verify_symbol(sym)
    next()
    return sym
  }

  function as_symbol_or_string (type) {
    if (!is('name')) {
      if (!is('string')) cr('Name or string expected')
      const tok = scope.token
      const result = new type({start: tok, end: tok, file, name: tok.value, quote: tok.quote})
      next()
      return result
    }
    const sym = _make_symbol(type)
    _verify_symbol(sym)
    next()
    return sym
  }

  function annotate (root, before_token = root.start) {
    const comments = before_token.comments_before
    const comments_after = comments_before.get(before_token)
    let i = comments_after != null ? comments_after : comments.length, comment
    while (--i >= 0) {
      comment = comments[i]
      if (/[@#]__/.test(comment.value)) {
        if (/[@#]__PURE__/.test(comment.value)) {
          set_annotation(root, _pure)
          break
        }
        if (/[@#]__INLINE__/.test(comment.value)) {
          set_annotation(root, _inline)
          break
        }
        if (/[@#]__NOINLINE__/.test(comment.value)) {
          set_annotation(root, _noinline)
          break
        }
        if (/[@#]__KEY__/.test(comment.value)) {
          set_annotation(root, _key)
          break
        }
        if (/[@#]__MANGLE_PROP__/.test(comment.value)) {
          set_annotation(root, _mangleprop)
          break
        }
      }
    }
    return root
  }

  function subscripts (expr, allow_calls, is_chain) {
    const start = expr.start
    if (is('punc', '.')) {
      next()
      if (is('privatename') && !scope.in_class) cr('private field for enclosing class')
      const ast_dot_variant = is('privatename') ? ast_dot_hash : ast_dot
      return annotate(subscripts(new ast_dot_variant({start, expr, optional: false, property: as_name(), end: prev(), file}), allow_calls, is_chain))
    }
    if (is('punc', '[')) {
      next()
      const property = expression(true)
      expect(']')
      return annotate(subscripts(new ast_sub({start, expr, optional: false, property, end: prev(), file}), allow_calls, is_chain))
    }
    if (allow_calls && is('punc', '(')) {
      next()
      const call = new ast_call({start, expr, optional: false, args: call_args(), end: prev(), file})
      annotate(call)
      return subscripts(call, true, is_chain)
    }
    if (is('punc', '?.')) {
      next()
      let chain_contents
      if (allow_calls && is('punc', '(')) {
        next()
        const call = new ast_call({start, optional: true, expr, args: call_args(), end: prev(), file})
        annotate(call)
        chain_contents = subscripts(call, true, true)
      } else if (is('name') || is('privatename')) {
        if (is('privatename') && !scope.in_class) cr('private field for enclosing class')
        const ast_dot_variant = is('privatename') ? ast_dot_hash : ast_dot
        chain_contents = annotate(subscripts(new ast_dot_variant({start, expr, optional: true,
          property: as_name(), end: prev(), file}), allow_calls, true))
      } else if (is('punc', '[')) {
        next()
        const property = expression(true)
        expect(']')
        chain_contents = annotate(subscripts(new ast_sub({start, expr, optional: true, property, end: prev(), file}), allow_calls, true))
      }
      if (!chain_contents) unexpected()
      if (chain_contents instanceof ast_chain) return chain_contents
      return new ast_chain({start, expr: chain_contents, end: prev(), file})
    }
    if (is('template_head')) {
      if (is_chain) unexpected()
      return subscripts(new ast_prefixed_template({start, prefix: expr,
        template_string: template_string(), end: prev(), file}), allow_calls)
    }
    return expr
  }

  function call_args () {
    const args = []
    while (!is('punc', ')')) {
      if (is('expand', '...')) {
        next()
        args.push(new ast_spread({start: prev(), expr: expression(false), end: prev(), file}))
      } else {
        args.push(expression(false))
      }
      if (!is('punc', ')')) expect(',')
    }
    next()
    return args
  }

  function maybe_unary (allow_calls, allow_arrows) {
    const start = scope.token
    if (start.type == 'name' && start.value == 'await' && can_await()) {
      next()
      return _await_expression()
    }
    if (is('operator') && UNARY_PREFIX.has(start.value)) {
      next()
      handle_regexp()
      const expr = make_unary(ast_unary_prefix, start, maybe_unary(allow_calls))
      expr.start = start
      expr.end = prev()
      return expr
    }
    let val = expr_atom(allow_calls, allow_arrows)
    while (is('operator') && UNARY_POSTFIX.has(scope.token.value) && !has_newline_before(scope.token)) {
      if (val instanceof ast_arrow) unexpected()
      val = make_unary(ast_unary_postfix, scope.token, val)
      val.start = start
      val.end = scope.token
      next()
    }
    return val
  }

  function make_unary (ctor, token, expr) {
    const operator = token.value
    switch (operator) {
      case '++': case '--':
        if (!is_assignable(expr)) cr('bad use of ' + operator + ' operator', token.line, token.col, token.pos)
        break
      case 'delete':
        break
    }
    return new ctor({operator, expr})
  }

  function expr_op (left, min_prec, no_in) {
    let op = is('operator') ? scope.token.value : null
    if (op == 'in' && no_in) op = null
    if (op == '**' && left instanceof ast_unary_prefix && !is_token(left.start, 'punc', '(')
      && left.operator !== '--' && left.operator !== '++') unexpected(left.start)
    const prec = op != null ? precedence[op] : null
    if (prec != null && (prec > min_prec || (op == '**' && min_prec === prec))) {
      next()
      const right = expr_ops(no_in, prec, true)
      return expr_op(new ast_binary({start: left.start, left, operator: op, right, end: right.end, file}), min_prec, no_in)
    }
    return left
  }

  function expr_ops (no_in, min_prec, allow_calls, allow_arrows) {
    if (!no_in && min_prec < precedence['in'] && is('privatename')) {
      if (!scope.in_class) cr('private field')
      const start = scope.token
      const key = new ast_symbol_private_property({start, name: start.value, end: start, file})
      next()
      expect_token('operator', 'in')
      const private_in = new ast_private_in({start, key, value: expr_ops(no_in, precedence['in'], true), end: prev(), file})
      return expr_op(private_in, 0, no_in)
    } else {
      return expr_op(maybe_unary(allow_calls, allow_arrows), min_prec, no_in)
    }
  }

  function maybe_conditional (no_in) {
    const start = scope.token, expr = expr_ops(no_in, 0, true, true)
    if (is('operator', '?')) {
      next()
      const consequent = expression(false)
      expect(':')
      return new ast_conditional({start, condition: expr, consequent,
        alt: expression(false, no_in), end: prev(), file})
    }
    return expr
  }

  function is_assignable (expr) {
    return expr instanceof ast_prop_access || expr instanceof ast_symbol_ref
  }

  function to_destructure (root) {
    if (root instanceof ast_object) {
      root = new ast_destructure({start: root.start, names: root.properties.map(to_destructure), is_array: false, end: root.end, file})
    } else if (root instanceof ast_array) {
      const names = []
      for (let i = 0, len = root.elements.length; i < len; i++) {
        if (root.elements[i] instanceof ast_spread) {
          if (i + 1 !== root.elements.length) tr(root.elements[i].start, 'spread must be last element')
          root.elements[i].expr = to_destructure(root.elements[i].expr)
        }
        names.push(to_destructure(root.elements[i]))
      }
      root = new ast_destructure({start: root.start, names, is_array: true, end: root.end, file})
    } else if (root instanceof ast_object_property) {
      root.value = to_destructure(root.value)
    } else if (root instanceof ast_assign) {
      root = new ast_default_assign({start: root.start, left: root.left, operator: '=',
        right: root.right, end: root.end, file})
    }
    return root
  }

  function maybe_assign (no_in) {
    handle_regexp()
    let start = scope.token
    if (start.type == 'name' && start.value == 'yield') {
      if (is_in_generator()) {
        next()
        return _yield_expression()
      }
    }
    let left = maybe_conditional(no_in), val = scope.token.value
    if (is('operator') && assignment.has(val)) {
      if (is_assignable(left) || (left = to_destructure(left)) instanceof ast_destructure) {
        next()
        return new ast_assign({start, left, operator: val, right: maybe_assign(no_in),
          logical: logical_asignment.has(val), end: prev(), file})
      }
      cr('bad assignment')
    }
    return left
  }

  function to_expr_or_sequence (start, exprs) {
    if (exprs.length === 1) {
      return exprs[0]
    } else if (exprs.length > 1) {
      return new ast_sequence({start, expressions: exprs, end: peek(), file})
    } else {
      cr('bad parenthesized expr')
    }
  }

  function expression (commas, no_in) {
    const exprs = [], start = scope.token
    while (true) {
      exprs.push(maybe_assign(no_in))
      if (!commas || !is('punc', ',')) break
      next()
      commas = true
    }
    return to_expr_or_sequence(start, exprs)
  }

  if (options.expr) return expression(true)

  function parse_toplevel () {
    const body = [], start = scope.token
    scope.input.push_directives_stack()
    let file = '', imports = [], imported = [], toplevel, resolved
    if (options.toplevel) {
      file = options.toplevel.file
      imports = options.toplevel.imports
      imported = options.toplevel.imported
    }
    while (!is('eof')) {
      const sta = statement()
      sta.file = file
      if (sta instanceof ast_import) {
        resolved = resolve(file, sta.module_name.value)
        if (!member(resolved, imported) && !member(resolved, imports)) {
          imports.unshift(resolved)
          toplevel = options.toplevel
          if (toplevel) {
            toplevel.imports = imports
            toplevel.imports = imports
            toplevel.pushed = false
          }
          return toplevel
        }
        body.push(sta)
      } else {
        body.push(sta)
      }
    }
    scope.input.pop_directives_stack()
    const end = prev()
    toplevel = options.toplevel
    if (toplevel) {
      toplevel.imports = imports
      toplevel.imports
      if (!toplevel.body) toplevel.body = []
      toplevel.body = toplevel.body.concat(body)
      toplevel.end = end
    } else {
      toplevel = new ast_toplevel({start, body, end, file})
      toplevel.imports = imports
    }
    template_raws = new Map()
    return toplevel
  }
  return parse_toplevel()
}

const code_line_break = 10
const code_space = 32
const r_annotation = /[@#]__(PURE|INLINE|NOINLINE)__/

function left_is_object (root) {
  if (root instanceof ast_object) return true
  if (root instanceof ast_sequence) return left_is_object(root.expressions[0])
  if (root instanceof ast_sequence) return left_is_object(root.expr)
  if (root instanceof ast_prefixed_template) return left_is_object(root.prefix)
  if (root instanceof ast_dot || root instanceof ast_sub) return left_is_object(root.expr)
  if (root instanceof ast_chain) return left_is_object(root.expr)
  if (root instanceof ast_conditional) return left_is_object(root.condition)
  if (root instanceof ast_binary) return left_is_object(root.left)
  if (root instanceof ast_unary_postfix) return left_is_object(root.expr)
  return false
}

function is_some_comments (comment) {
  return ((comment.type == 'comment2' || comment.type == 'comment1') && /@preserve|@copyright|@lic|@cc_on|^\**!/i.test(comment.value))
}

class rope {
  constructor () {
    this.committed = ''
    this.current = ''
  }
  append (string) {
    if (this.current.length > 10000) {
      this.committed += this.current + string
      this.current = ''
    } else {
      this.current += string
    }
  }
  insertAt (char, index) {
    const { committed, current } = this
    if (index < committed.length) {
      this.committed = committed.slice(0, index) + char + committed.slice(index)
    } else if (index === committed.length) {
      this.committed += char
    } else {
      index -= committed.length
      this.committed += current.slice(0, index) + char
      this.current = current.slice(index)
    }
  }
  charAt (index) {
    const { committed } = this
    if (index < committed.length) return committed[index]
    return this.current[index - committed.length]
  }
  charCodeAt (index) {
    const { committed } = this
    if (index < committed.length) return committed.charCodeAt(index)
    return this.current.charCodeAt(index - committed.length)
  }
  length () {
    return this.committed.length + this.current.length
  }
  expect_directive () {
    let char, n = this.length()
    if (n <= 0) return true
    while ((char = this.charCodeAt(--n)) && (char == code_space || char == code_line_break))
    return !char || char === 59 || char === 123
  }
  has_nlb () {
    let n = this.length() - 1
    while (n >= 0) {
      const code = this.charCodeAt(n--)
      if (code === code_line_break) return true
      if (code !== code_space) return false
    }
    return true
  }
  toString () {
    return this.committed + this.current
  }
}

function output_stream (options) {
  const readonly = !options
  options = defaults(options, {'ascii_only': false, 'beautify': false, 'braces': false,
    'comments': 'some', 'indent_level': 4, 'indent_start': 0, 'inline_script': true, 'keep_numbers': false,
    'keep_quoted_props': false, 'max_line_len': false, 'preamble': null, 'preserve_annotations': false,
    'quote_keys': false, 'quote_style': 0, 'semicolons': true, 'shebang': true, 'shorthand': undefined,
    'source_map': null, 'webkit': false, 'width': 80, 'wrap_iife': false, 'wrap_func_args': true,
    '_destroy_ast': false})
  if (options.shorthand === undefined) options.shorthand = true
  let comment_filter = return_false
  if (options.comments) {
    let comments = options.comments
    if (typeof options.comments == 'string' && /^\/.*\/[a-zA-Z]*$/.test(options.comments)) {
      const regex_pos = options.comments.lastIndexOf('/')
      comments = new RegExp(options.comments.substr(1, regex_pos - 1), options.comments.substr(regex_pos + 1))
    }
    if (comments instanceof RegExp) {
      comment_filter = function (comment) {
        return comment.type != 'comment5' && comments.test(comment.value)
      }
    } else if (typeof comments == 'function') {
      comment_filter = function (comment) {
        return comment.type != 'comment5' && comments(this, comment)
      }
    } else if (comments == 'some') {
      comment_filter = is_some_comments
    } else {
      comment_filter = return_true
    }
  }

  if (options.preserve_annotations) {
    let prev_comment_filter = comment_filter
    comment_filter = function (comment) {
      return r_annotation.test(comment.value) || prev_comment_filter.apply(this, arguments)
    }
  }

  const outp = new rope()

  let indentation = 0, current_col = 0, current_pos = 0, current_line = 1
  let printed_comments = new Set()

  const to_utf8 = options.ascii_only ? function (string, identifier = false, regexp = false) {
    if (!regexp) {
      string = string.replace(/[\ud800-\udbff][\udc00-\udfff]/g, function (char) {
        return '\\u{' + get_full_char_code(char, 0).toString(16) + '}'
      })
    }
    return string.replace(/[\u0000-\u001f\u007f-\uffff]/g, function (char) {
      const code = char.charCodeAt(0).toString(16)
      if (code.length <= 2 && !identifier) {
        while (code.length < 2) code = '0' + code
        return '\\x' + code
      } else {
        while (code.length < 4) code = '0' + code
        return '\\u' + code
      }
    })
  } : function (string) {
    return string.replace(/[\ud800-\udbff][\udc00-\udfff]|([\ud800-\udbff]|[\udc00-\udfff])/g, function (match, lone) {
      if (lone) return '\\u' + lone.charCodeAt(0).toString(16)
      return match
    })
  }

  function make_string (string, quote) {
    let dq = 0, sq = 0
    string = string.replace(/[\\\b\f\n\r\v\t\x22\x27\u2028\u2029\0\ufeff]/g,
      function (s, i) {
      switch (s) {
        case '"': ++dq; return '"'
        case "'": ++sq; return "'"
        case '\\': return '\\\\'
        case '\n': return '\\n'
        case '\r': return '\\r'
        case '\t': return '\\t'
        case '\b': return '\\b'
        case '\f': return '\\f'
        case '\x0B': return '\\v'
        case '\u2028': return '\\u2028'
        case '\u2029': return '\\u2029'
        case '\ufeff': return '\\ufeff'
        case '\0': return /[0-9]/.test(get_full_char(string, i+1)) ? '\\x00' : '\\0'
      }
      return s
    })

    function single_quote () {
      return "'" + string.replace(/\x27/g, "\\'") + "'"
    }

    function quote_double () {
      return '"' + string.replace(/\x22/g, '\\"') + '"'
    }

    function quote_template () {
      return '`' + string.replace(/`/g, "\\`") + '`'
    }

    string = to_utf8(string)
    if (quote == '`') return quote_template()
    switch (options.quote_style) {
      case 1:
      return single_quote()
      case 2:
      return quote_double()
      case 3:
      return quote == '"' ? quote_double() : single_quote()
      default:
      return dq > sq ? single_quote() : quote_double()
    }
  }

  function encode_string (string, quote) {
    let result = make_string(string, quote)
    if (options.inline_script) {
      result = result.replace(/<\x2f(script)([>\/\t\n\f\r ])/gi, '<\\/$1$2')
      result = result.replace(/\x3c!--/g, '\\x3c!--')
      result = result.replace(/--\x3e/g, '--\\x3e')
    }
    return result
  }

  function make_name (name) {
    name = to_utf8(name.toString(), true)
    return name
  }

  let might_add_newline = 0, newline_insert = -1, last = ''
  let mappings = options.source_map && [], mapping_name, mapping_token
  let has_parens, might_need_space, might_need_semicolon, need_newline_indented, need_space

  const do_add_mapping = mappings ? function () {
    mappings.forEach(function (mapping) {
      try {
        let { name, token } = mapping
        if (name !== false) {
          if (token.type == 'name' || token.type == 'privatename') {
            name = token.value
          } else if (name instanceof ast_symbol) {
            name = token.type == 'string' ? token.value : name.name
          }
        }
        options.source_map.add(
          mapping.token.file,
          mapping.line, mapping.col,
          mapping.token.line, mapping.token.col,
          is_basic_identifier_string(name) ? name : undefined
        )
      } catch(error) {}
    })
    mappings = []
  } : func

  const ensure_line_len = options.max_line_len ? function () {
    if (current_col > options.max_line_len) {
      if (might_add_newline) {
        outp.insertAt('\n', might_add_newline)
        const len_after_newline = outp.length() - might_add_newline - 1
        if (mappings) {
          const delta = len_after_newline - current_col
          mappings.forEach(function (mapping) {
            mapping.line++
            mapping.col += delta
          })
        }
        current_line++
        current_pos++
        current_col = len_after_newline
      }
    }
    if (might_add_newline) {
      might_add_newline = 0
      do_add_mapping()
    }
  } : func

  const require_semicolon = make_set('( [ + * / - , . `')

  function print (string) {
    string = String(string)
    const char = get_full_char(string, 0)
    if (need_newline_indented && char) {
      need_newline_indented = false
      if (char !== '\n') {
        print('\n')
        indent()
      }
    }
    if (need_space && char) {
      need_space = false
      if (!/[\s;})]/.test(char)) space()
    }
    newline_insert = -1
    const prev = last.charAt(last.length - 1)
    if (might_need_semicolon) {
      might_need_semicolon = false
      if (prev == ':' && char == '}' || (!char || !member(char, ';}')) && prev !== ';') {
        if (options.semicolons || require_semicolon.has(char)) {
          outp.append(';')
          current_col++
          current_pos++
        } else {
          ensure_line_len()
          if (current_col > 0) {
            outp.append('\n')
            current_pos++
            current_line++
            current_col = 0
          }
          if (/^\s+$/.test(string)) might_need_semicolon = true
        }
        if (!options.beautify) might_need_space = false
      }
    }

    if (might_need_space) {
      if ((is_identifier_char(prev) && (is_identifier_char(char) || char == '\\'))
        || (char == '/' && char == prev) || ((char == '+' || char == '-') && char == last)) {
        outp.append(' ')
        current_col++
        current_pos++
      }
      might_need_space = false
    }

    if (mapping_token) {
      mappings.push({
        token: mapping_token,
        name: mapping_name,
        line: current_line,
        col: current_col
      })
      mapping_token = false
      if (!might_add_newline) do_add_mapping()
    }

    outp.append(string)
    has_parens = string[string.length - 1] == '('
    current_pos += string.length
    const a = string.split(/\r?\n/), n = a.length - 1
    current_line += n
    current_col += a[0].length
    if (n > 0) {
      ensure_line_len()
      current_col = a[n].length
    }
    last = string
  }

  function star () { print('*') }

  const space = options.beautify ? function () { print(' ') } : function () { might_need_space = true }
  const indent_level = options.indent_level
  const redent = options.beautify ? function () { indentation += indent_level } : func
  const undent = options.beautify ? function () { indentation -= indent_level } : func
  const indent = options.beautify ? function (level=0) {
    indentation += level * indent_level
    print(' '.repeat(options.indent_start + indentation))
  } : func

  const with_indent = options.beautify ? function (col, cont) {
    if (col === true) col = next_indent()
    const save_indentation = indentation
    indentation = col
    const result = cont()
    indentation = save_indentation
    return result
  } : function (col, cont) { return cont() }

  const newline = options.beautify ? function () {
    if (newline_insert < 0) return print('\n')
    if (outp.charAt(newline_insert) != '\n') {
      outp.insertAt('\n', newline_insert)
      current_pos++
      current_line++
    }
    newline_insert++
  } : options.max_line_len ? function () {
    ensure_line_len()
    might_add_newline = outp.length()
  } : func

  const semicolon = options.beautify ? function () { print(';') } : function () { might_need_semicolon = true }

  function force_semicolon () {
    might_need_semicolon = false
    print(';')
  }

  function next_indent () { return indentation + options.indent_level }

  function with_block (cont) {
    let result
    print('{')
    with_indent(next_indent(), function () { result = cont() })
    print('}')
    return result
  }

  function with_parens (cont) {
    print('(')
    const result = cont()
    print(')')
    return result
  }

  function with_square (cont) {
    print('[')
    const result = cont()
    print(']')
    return result
  }

  function comma () {
    print(',')
    space()
  }

  function colon () {
    print(':')
    space()
  }

  const add_mapping = mappings ? function (token, name) {
    mapping_token = token
    mapping_name = name
  } : func

  function get () {
    if (might_add_newline) ensure_line_len()
    return outp.toString()
  }

  function filter_comment (comment) {
    if (!options.preserve_annotations) comment = comment.replace(r_annotation, ' ')
    if (/^\s*$/.test(comment)) return ''
    return comment.replace(/(<\s*\/\s*)(script)/i, '<\\/$2')
  }

  function prepend_comments (root) {
    const self = this
    const start = root.start
    if (!start) return
    const printed_comments = self.printed_comments
    const keyword_with_value = root instanceof ast_exit && root.value || ((root instanceof ast_await) || root instanceof ast_yield) && root.expr
    if (start.comments_before && printed_comments.has(start.comments_before)) {
      if (keyword_with_value) {
        start.comments_before = []
      } else {
        return
      }
    }
    let comments = start.comments_before
    if (!comments) {
      comments = start.comments_before = []
    } else if (comments.length) {
      printed_comments.add(comments)
    }
    if (keyword_with_value) {
      let trees = new observes(function (root) {
        const parent = trees.parent()
        if (parent instanceof ast_exit || parent instanceof ast_await || parent instanceof ast_yield
          || parent instanceof ast_binary && parent.left === root || parent instanceof ast_call && parent.expr === root
          || parent instanceof ast_conditional && parent.condition === root || parent instanceof ast_dot && parent.expr === root
          || parent instanceof ast_sequence && parent.expressions[0] === root || parent instanceof ast_sub && parent.expr === root
          || parent instanceof ast_unary_postfix) {
          if (!root.start) return
          const text = root.start.comments_before
          if (text && !printed_comments.has(text)) {
            if (text.length) printed_comments.add(text)
            comments = comments.concat(text)
          }
        } else {
          return true
        }
      })
      trees.push(root)
      keyword_with_value.observe(trees)
    }

    if (current_pos == 0) {
      if (comments.length > 0 && options.shebang && comments[0].type == 'comment5'
        && !printed_comments.has(comments[0])) {
        print('#!' + comments.shift().value + '\n')
        indent()
      }
      const preamble = options.preamble
      if (preamble) {
        print(preamble.replace(/\r\n?|[\n\u2028\u2029]|\s*$/g, '\n'))
      }
    }

    comments = comments.filter(comment_filter, root).filter(c => !printed_comments.has(c))
    if (comments.length == 0) return
    const has_nlb = outp.has_nlb()
    comments.forEach(function (c, i) {
      if (c.length) printed_comments.add(c)
      if (!has_nlb) {
        if (c.nlb()) {
          print('\n')
          indent()
          has_nlb = true
        } else if (i > 0) {
          space()
        }
      }
      if (/comment[134]/.test(c.type)) {
        const value = filter_comment(c.value)
        if (value) {
          print('//' + value + '\n')
          indent()
        }
        has_nlb = true
      } else if (c.type == 'comment2') {
        const value = filter_comment(c.value)
        if (value) print('/*' + value + '*/')
        has_nlb = false
      }
    })
    if (!has_nlb) {
      if (start.nlb()) {
        print('\n')
        indent()
      } else {
        space()
      }
    }
  }

  function append_comments (root, tail) {
    const token = root.end
    if (!token) return
    const self = this, printed_comments = self.printed_comments, comments = token[tail ? 'comments_before' : 'comments_after']
    if (!comments || printed_comments.has(comments)) return
    if (!(root instanceof ast_state || comments.every((c) => !/comment[134]/.test(c.type)))) return
    if (comments.length) printed_comments.add(comments)
    const insert = outp.length()
    comments.filter(comment_filter, root).forEach(function (c, i) {
      if (printed_comments.has(c)) return
      if (c.length) printed_comments.add(c)
      need_space = false
      if (need_newline_indented) {
        print('\n')
        indent()
        need_newline_indented = false
      } else if (c.nlb() && (i > 0 || !outp.has_nlb())) {
        print('\n')
        indent()
      } else if (i > 0 || !tail) {
        space()
      }
      if (/comment[134]/.test(c.type)) {
        const value = filter_comment(c.value)
        if (value) print('//' + value)
        need_newline_indented = true
      } else if (c.type == 'comment2') {
        const value = filter_comment(c.value)
        if (value) print('/*' + value + '*/')
        need_space = true
      }
    })
    if (outp.length() > insert) newline_insert = insert
  }

  function gc_scope (scope) {
    if (options['_destroy_ast']) {
      scope.body.length = 0
      scope.argnames.length = 0
    }
  }

  function print_string (string, quote, escape_directive) {
    const encoded = encode_string(string, quote)
    if (escape_directive === true && !member('\\', encoded)) {
      if (!outp.expect_directive()) force_semicolon()
      force_semicolon()
    }
    print(encoded)
  }

  function print_template_chars (string) {
    const encoded = encode_string(string, '`').replace(/\${/g, '\\${')
    return print(encoded.substr(1, encoded.length - 2))
  }

  const stack = []
  return {get, toString: get, indent, undent, redent, in_directive: false, use_asm: null, active_scope: null,
    indentation: function () { return indentation }, current_width: function () { return current_col - indentation },
    should_break: function () { return options.width && this.current_width() >= options.width },
    has_parens: function () { return has_parens }, last: function () { return last },
    newline, print, star, space, comma, colon, semicolon, force_semicolon, to_utf8,
    print_name: function (name) { print(make_name(name)) },
    print_string, print_template_chars, encode_string, next_indent, with_indent,
    with_block, with_parens, with_square, add_mapping, options, gc_scope, printed_comments,
    prepend_comments: readonly ? func : prepend_comments,
    append_comments: readonly || comment_filter === return_false ? func : append_comments,
    line: function () { return current_line}, col: function () { return current_col },
    pos: function () { return current_pos }, push_node: function (root) { stack.push(root) },
    pop_node: function () { return stack.pop() }, parent: function (n) { return stack[stack.length - 2 - (n || 0)]}}
}

function def_parens (root, func) {
  root.prototype.needs_parens = func
}

def_parens(tree, return_false)

def_parens(ast_function, function (output) {
  if (!output.has_parens() && first_in_statement(output)) return true
  if (output.options['webkit']) {
    const p = output.parent()
    if (p instanceof ast_prop_access && p.expr === this) return true
  }
  if (output.options['wrap_iife']) {
    const p = output.parent()
    if (p instanceof ast_call && p.expr === this) return true
  }
  if (output.options['wrap_func_args']) {
    const p = output.parent()
    if (p instanceof ast_call && member(this, p.args)) return true
  }
  return false
})

def_parens(ast_arrow, function (output) {
  const p = output.parent()
  if (output.options['wrap_func_args'] && p instanceof ast_call && member(this, p.args)) return true
  return p instanceof ast_prop_access && p.expr === this || p instanceof ast_conditional && p.condition === this
})

def_parens(ast_object, function (output) { return !output.has_parens() && first_in_statement(output) })

def_parens(ast_class_expression, first_in_statement)

def_parens(ast_unary, function (output) {
  const p = output.parent()
  return p instanceof ast_prop_access && p.expr === this || p instanceof ast_call && p.expr === this || p instanceof ast_binary
      && p.operator == '**' && this instanceof ast_unary_prefix && p.left === this && this.operator !== '++' && this.operator !== '--'
})

def_parens(ast_await, function (output) {
  const p = output.parent()
  return p instanceof ast_prop_access && p.expr === this || p instanceof ast_call && p.expr === this
    || p instanceof ast_binary && p.operator == '**' && p.left === this
})

def_parens(ast_sequence, function (output) {
  const p = output.parent()
  return p instanceof ast_call || p instanceof ast_unary || p instanceof ast_binary
    || p instanceof ast_var_def || p instanceof ast_prop_access || p instanceof ast_array
    || p instanceof ast_object_property || p instanceof ast_conditional || p instanceof ast_arrow
    || p instanceof ast_default_assign || p instanceof ast_spread || p instanceof ast_for_of && this === p.object
    || p instanceof ast_yield  || p instanceof ast_export})

def_parens(ast_binary, function (output) {
  const p = output.parent()
  if (p instanceof ast_call && p.expr === this) return true
  if (p instanceof ast_unary) return true
  if (p instanceof ast_prop_access && p.expr === this) return true
  if (p instanceof ast_binary) {
    const parent_op = p.operator
    const op = this.operator
    if (op == '??' && (parent_op == '||' || parent_op == '&&')) return true
    if (parent_op == '??' && (op == '||' || op == '&&')) return true
    const pp = precedence[parent_op]
    const sp = precedence[op]
    if (pp > sp || (pp == sp && (this === p.right || parent_op == '**'))) return true
  }
  if (p instanceof ast_private_in) {
    const op = this.operator
    const pp = precedence['in']
    const sp = precedence[op]
    if (pp > sp || (pp == sp && this === p.value)) return true
  }
})

def_parens(ast_private_in, function (output) {
  const p = output.parent()
  if (p instanceof ast_call && p.expr === this) return true
  if (p instanceof ast_unary) return true
  if (p instanceof ast_prop_access && p.expr === this) return true
  if (p instanceof ast_binary) {
    const parent_op = p.operator
    const pp = precedence[parent_op]
    const sp = precedence['in']
    if (pp > sp || (pp == sp && (this === p.right || parent_op == '**'))) return true
  }
  if (p instanceof ast_private_in && this === p.value) return true
})

def_parens(ast_yield, function (output) {
  const p = output.parent()
  if (p instanceof ast_binary && p.operator !== '=') return true
  if (p instanceof ast_call && p.expr === this) return true
  if (p instanceof ast_conditional && p.condition === this) return true
  if (p instanceof ast_unary) return true
  if (p instanceof ast_prop_access && p.expr === this) return true
})

def_parens(ast_chain, function (output) {
  const p = output.parent()
  if (!(p instanceof ast_call || p instanceof ast_prop_access)) return false
  return p.expr === this
})

def_parens(ast_prop_access, function (output) {
  const p = output.parent()
  if (p instanceof ast_new && p.expr === this) {
    return observe(this, root => {
      if (root instanceof ast_scope) return true
      if (root instanceof ast_call) return walk_abort
    })
  }
})

def_parens(ast_call, function (output) {
  const p = output.parent()
  let p1
  if (p instanceof ast_new && p.expr === this || p instanceof ast_export && p.is_default && this.expr instanceof ast_function) return true
  return this.expr instanceof ast_function && p instanceof ast_prop_access
    && p.expr === this && (p1 = output.parent(1)) instanceof ast_assign && p1.left === p
})

def_parens(ast_new, function (output) {
  const p = output.parent()
  if (this.args.length === 0 && (p instanceof ast_prop_access || p instanceof ast_call && p.expr === this
      || p instanceof ast_prefixed_template && p.prefix === this))
    return true
})

def_parens(ast_number, function (output) {
  const p = output.parent()
  if (p instanceof ast_prop_access && p.expr === this) {
    const value = this.getValue()
    if (value < 0 || /^0/.test(make_num(value))) return true
  }
})

def_parens(ast_big_int, function (output) {
  const p = output.parent()
  if (p instanceof ast_prop_access && p.expr === this) {
    const value = this.getValue()
    if (value.startsWith('-')) return true
  }
})

def_parens(ast_assign, function (output) {
  const p = output.parent()
  if (p instanceof ast_unary) return true
  if (p instanceof ast_binary && !(p instanceof ast_assign)) return true
  if (p instanceof ast_call && p.expr === this) return true
  if (p instanceof ast_conditional && p.condition === this) return true
  if (p instanceof ast_prop_access && p.expr === this) return true
  if (this instanceof ast_assign && this.left instanceof ast_destructure && this.left.is_array === false) return true
})

def_parens(ast_conditional, ast_assign.prototype.needs_parens)

function def_print (nodetype, generator) {
  nodetype.prototype.codegen = generator
}

function output_js () {
  tree.prototype.print = function (output, force_parens) {
    const self = this, generator = self.codegen
    if (self instanceof ast_scope) {
      output.active_scope = self
    } else if (!output.use_asm && self instanceof ast_directive && self.value == 'use asm') {
      output.use_asm = output.active_scope
    }
    function generate () {
      output.prepend_comments(self)
      self.add_source_map(output)
      generator(self, output)
      output.append_comments(self)
    }
    output.push_node(self)
    force_parens || self.needs_parens(output) ? output.with_parens(generate) : generate()
    output.pop_node()
    if (self === output.use_asm) {
      output.use_asm = null
    }
  }
  tree.prototype._print = tree.prototype.print
  tree.prototype.print_to_string = function (options) {
    const output = output_stream(options)
    this.print(output)
    return output.get()
  }

  def_print(ast_directive, function (self, output) {
    output.print_string(self.value, self.quote)
    output.semicolon()
  })
  def_print(ast_spread, function (self, output) {
    output.print('...')
    self.expr.print(output)
  })
  def_print(ast_destructure, function (self, output) {
    output.print(self.is_array ? '[' : '{')
    const len = self.names.length
    self.names.forEach(function (name, i) {
      if (i > 0) output.comma()
      name.print(output)
      if (i == len - 1 && name instanceof ast_hole) output.comma()
    })
    output.print(self.is_array ? ']' : '}')
  })
  def_print(ast_debugger, function (self, output) {
    output.print('debugger')
    output.semicolon()
  })

  function display_body (body, is_toplevel, output, allow_directives) {
    const last = body.length - 1
    output.in_directive = allow_directives
    body.forEach(function (statement, i) {
      if (output.in_directive === true && !(statement instanceof ast_directive || statement instanceof ast_empty_statement
        || (statement instanceof ast_statement && statement.body instanceof ast_string))) {
        output.in_directive = false
      }
      if (!(statement instanceof ast_empty_statement)) {
        statement.print(output)
        if (!(i == last && is_toplevel)) {
          output.newline()
          if (is_toplevel) output.newline()
        }
      }
      if (output.in_directive === true && statement instanceof ast_statement && statement.body instanceof ast_string) {
        output.in_directive = false
      }
    })
    output.in_directive = false
  }

  ast_statement_with_body.prototype._do_print_body = function (output) {
    print_maybe_braced_body(this.body, output)
  }
  def_print(ast_state, function (self, output) {
    self.body.print(output)
    output.semicolon()
  })
  def_print(ast_toplevel, function (self, output) {
    display_body(self.body, true, output, true)
    output.print('')
  })
  def_print(ast_labeled_statement, function (self, output) {
    self.label.print(output)
    output.colon()
    self.body.print(output)
  })
  def_print(ast_statement, function (self, output) {
    self.body.print(output)
    output.semicolon()
  })

  function print_braced_empty(self, output) {
    output.print('{')
    output.with_indent(output.next_indent(), function () {
      output.append_comments(self, true)
    })
    output.add_mapping(self.end)
    output.print('}')
  }

  function print_braced (self, output, allow_directives) {
    if (self.body.length > 0) {
      output.with_block(function () {
        display_body(self.body, false, output, allow_directives)
        output.add_mapping(self.end)
      })
    } else {
      print_braced_empty(self, output)
    }
  }

  def_print(ast_block_statement, function (self, output) {
    print_braced(self, output)
  })
  def_print(ast_empty_statement, function (self, output) {
    output.semicolon()
  })
  def_print(ast_do, function (self, output) {
    output.print('do')
    output.space()
    make_block(self.body, output)
    output.space()
    output.print('while')
    output.space()
    output.with_parens(function () { self.condition.print(output) })
    output.semicolon()
  })
  def_print(ast_while, function (self, output) {
    output.print('while')
    output.space()
    output.with_parens(function () { self.condition.print(output) })
    output.space()
    self._do_print_body(output)
  })
  def_print(ast_for, function (self, output) {
    output.print('for')
    output.space()
    output.with_parens(function () {
      if (self.init) {
        self.init instanceof ast_definitions ? self.init.print(output) : parenthesize(self.init, output, true)
        output.print(';')
        output.space()
      } else {
        output.print(';')
      }
      if (self.condition) {
        self.condition.print(output)
        output.print(';')
        output.space()
      } else {
        output.print(';')
      }
      if (self.step) self.step.print(output)
    })
    output.space()
    self._do_print_body(output)
  })
  def_print(ast_for_in, function (self, output) {
    output.print('for')
    if (self.await) {
      output.space()
      output.print('await')
    }
    output.space()
    output.with_parens(function () {
      self.init.print(output)
      output.space()
      output.print(self instanceof ast_for_of ? 'of' : 'in')
      output.space()
      self.object.print(output)
    })
    output.space()
    self._do_print_body(output)
  })
  def_print(ast_with, function (self, output) {
    output.print('with')
    output.space()
    output.with_parens(function () {
      self.expr.print(output)
    })
    output.space()
    self._do_print_body(output)
  })
  ast_lambda.prototype._do_print = function (output, nokeyword) {
    const self = this
    if (!nokeyword) {
      if (self.sync) {
        output.print('async')
        output.space()
      }
      output.print('function')
      if (self.gen) output.star()
      if (self.name) output.space()
    }
    if (self.name instanceof ast_symbol) {
      self.name.print(output)
    } else if (nokeyword && self.name instanceof tree) {
      output.with_square(function () { self.name.print(output) })
    }
    output.with_parens(function () {
      self.argnames.forEach(function (arg, i) {
        if (i) output.comma()
        arg.print(output)
      })
    })
    output.space()
    print_braced(self, output, true)
  }
  def_print(ast_lambda, function (self, output) {
    self._do_print(output)
    output.gc_scope(self)
  })
  def_print(ast_prefixed_template, function (self, output) {
    const tag = self.prefix
    const parenthesize_tag = tag instanceof ast_lambda || tag instanceof ast_binary || tag instanceof ast_conditional
      || tag instanceof ast_sequence  || tag instanceof ast_unary || tag instanceof ast_dot && tag.expr instanceof ast_object
    if (parenthesize_tag) output.print('(')
    self.prefix.print(output)
    if (parenthesize_tag) output.print(')')
    self.template_string.print(output)
  })
  def_print(ast_template_string, function (self, output) {
    const is_tagged = output.parent() instanceof ast_prefixed_template
    output.print('`')
    for (let i = 0, len = self.segments.length; i < len; i++) {
      if (!(self.segments[i] instanceof ast_template_segment)) {
        output.print('${')
        self.segments[i].print(output)
        output.print('}')
      } else if (is_tagged) {
        output.print(self.segments[i].raw)
      } else {
        output.print_template_chars(self.segments[i].value)
      }
    }
    output.print('`')
  })
  def_print(ast_template_segment, function (self, output) {
    output.print_template_chars(self.value)
  })
  ast_arrow.prototype._do_print = function (output) {
    const self = this, parent = output.parent()
    const needs_parens = (parent instanceof ast_binary && !(parent instanceof ast_assign)) ||
      parent instanceof ast_unary || (parent instanceof ast_call && self === parent.expr)
    if (needs_parens) output.print('(')
    if (self.sync) {
      output.print('async')
      output.space()
    }
    if (self.argnames.length === 1 && self.argnames[0] instanceof ast_symbol) {
      self.argnames[0].print(output)
    } else {
      output.with_parens(function () {
        self.argnames.forEach(function (arg, i) {
          if (i) output.comma()
          arg.print(output)
        })
      })
    }
    output.space()
    output.print('=>')
    output.space()
    const first_statement = self.body[0]
    if (self.body.length === 1 && first_statement instanceof ast_return) {
      const returned = first_statement.value
      if (!returned) {
        output.print('{}')
      } else if (left_is_object(returned)) {
        output.print('(')
        returned.print(output)
        output.print(')')
      } else {
        returned.print(output)
      }
    } else {
      print_braced(self, output)
    }
    if (needs_parens) { output.print(')') }
    output.gc_scope(self)
  }
  ast_exit.prototype._do_print = function (output, kind) {
    output.print(kind)
    if (this.value) {
      output.space()
      const comments = this.value.start.comments_before
      if (comments && comments.length && !output.printed_comments.has(comments)) {
        output.print('(')
        this.value.print(output)
        output.print(')')
      } else {
        this.value.print(output)
      }
    }
    output.semicolon()
  }
  def_print(ast_return, function (self, output) {
    self._do_print(output, 'return')
  })
  def_print(ast_throw, function (self, output) {
    self._do_print(output, 'throw')
  })
  def_print(ast_yield, function (self, output) {
    const star = self.star ? '*' : ''
    output.print('yield' + star)
    if (self.expr) {
      output.space()
      self.expr.print(output)
    }
  })
  def_print(ast_await, function (self, output) {
    output.print('await')
    output.space()
    const expr = self.expr
    const parens = !(expr instanceof ast_call || expr instanceof ast_symbol_ref || expr instanceof ast_prop_access
      || expr instanceof ast_unary || expr instanceof ast_literal || expr instanceof ast_await || expr instanceof ast_object)
    if (parens) output.print('(')
    self.expr.print(output)
    if (parens) output.print(')')
  })

  ast_loop_control.prototype._do_print = function (output, kind) {
    output.print(kind)
    if (this.label) {
      output.space()
      this.label.print(output)
    }
    output.semicolon()
  }
  def_print(ast_break, function (self, output) {
    self._do_print(output, 'break')
  })
  def_print(ast_continue, function (self, output) {
    self._do_print(output, 'continue')
  })

  function make_then (self, output) {
    let body = self.body
    if (output.options['braces'] || body instanceof ast_do) return make_block(body, output)
    if (!body) return output.force_semicolon()
    while (true) {
      if (body instanceof ast_if) {
        if (!body.alt) {
          make_block(self.body, output)
          return
        }
        body = body.alt
      } else if (body instanceof ast_statement_with_body) {
        body = body.body
      } else {
        break
      }
    }
    print_maybe_braced_body(self.body, output)
  }

  def_print(ast_if, function (self, output) {
    output.print('if')
    output.space()
    output.with_parens(function () {
      self.condition.print(output)
    })
    output.space()
    if (self.alt) {
      make_then(self, output)
      output.space()
      output.print('else')
      output.space()
      if (self.alt instanceof ast_if) {
        self.alt.print(output)
      } else {
        print_maybe_braced_body(self.alt, output)
      }
    } else {
      self._do_print_body(output)
    }
  })
  def_print(ast_switch, function (self, output) {
    output.print('switch')
    output.space()
    output.with_parens(function () {
      self.expr.print(output)
    })
    output.space()
    const last = self.body.length - 1
    if (last < 0) {
      print_braced_empty(self, output)
    } else {
      output.with_block(function () {
        self.body.forEach(function (branch, i) {
          output.indent(true)
          branch.print(output)
          if (i < last && branch.body.length > 0) output.newline()
        })
      })
    }
  })
  ast_switch_branch.prototype._do_print_body = function (output) {
    output.newline()
    this.body.forEach(function (statement) {
      output.indent()
      statement.print(output)
      output.newline()
    })
  }
  def_print(ast_default, function (self, output) {
    output.print('default:')
    self._do_print_body(output)
  })
  def_print(ast_case, function (self, output) {
    output.print('case')
    output.space()
    self.expr.print(output)
    output.print(':')
    self._do_print_body(output)
  })
  def_print(ast_try, function (self, output) {
    output.print('try')
    output.space()
    self.body.print(output)
    if (self.bcatch) {
      output.space()
      self.bcatch.print(output)
    }
    if (self.bfinally) {
      output.space()
      self.bfinally.print(output)
    }
  })
  def_print(ast_try_block, function (self, output) {
    print_braced(self, output)
  })
  def_print(ast_catch, function (self, output) {
    output.print('catch')
    if (self.argname) {
      output.space()
      output.with_parens(function () {
        self.argname.print(output)
      })
    }
    output.space()
    print_braced(self, output)
  })
  def_print(ast_finally, function (self, output) {
    output.print('finally')
    output.space()
    print_braced(self, output)
  })
  ast_definitions.prototype._do_print = function (output, kind) {
    output.print(kind)
    output.space()
    this.defs.forEach(function (defined, i) {
      if (i) output.comma()
      defined.print(output)
    })
    const p = output.parent()
    const in_for = p instanceof ast_for || p instanceof ast_for_in
    if (!in_for || p && p.init !== this) output.semicolon()
  }
  def_print(ast_let, function (self, output) {
    self._do_print(output, 'let')
  })
  def_print(ast_var, function (self, output) {
    self._do_print(output, 'var')
  })
  def_print(ast_const, function (self, output) {
    self._do_print(output, 'const')
  })
  def_print(ast_import, function (self, output) {})
  def_print(ast_name_mapping, function (self, output) {
    const is_import = output.parent() instanceof ast_import, defined = self.name.defined(), foreign_name = self.foreign_name
    const different_names = (defined && defined.mangled_name || self.name.name) !== foreign_name.name
    if (!different_names && foreign_name.name == '*' && foreign_name.quote != self.name.quote) different_names = true
    const is_name = foreign_name.quote == null
    if (different_names) {
      if (is_import) {
        is_name ? output.print(foreign_name.name) : output.print_string(foreign_name.name, foreign_name.quote)
      } else {
        self.name.quote == null ? self.name.print(output) : output.print_string(self.name.name, self.name.quote)
      }
      output.space()
      output.print('as')
      output.space()
      if (is_import) {
        self.name.print(output)
      } else {
        is_name ? output.print(foreign_name.name) : output.print_string(foreign_name.name, foreign_name.quote)
      }
    } else {
      self.name.quote == null ? self.name.print(output) : output.print_string(self.name.name, self.name.quote)
    }
  })
  def_print(ast_export, function (self, output) {
    if (self.names) {
      if (self.names.length === 1 &&
        self.names[0].name.name == '*' &&
        !self.names[0].name.quote) {
          self.names[0].print(output)
      } else {
        output.print('{')
        self.names.forEach(function (name_export, i) {
          output.space()
          name_export.print(output)
          if (i < self.names.length - 1) output.print(',')
        })
        output.space()
        output.print('}')
      }
    } else if (self.value) {
      self.value.print(output)
    } else if (self.defined) {
      self.defined.print(output)
      if (self.defined instanceof ast_definitions) return
    }
    if (self.module_name) {
      output.space()
      output.print('from')
      output.space()
      self.module_name.print(output)
    }
    if (self.assert_clause) {
      output.print('assert')
      self.assert_clause.print(output)
    }
    if (self.value && !(self.value instanceof ast_defun
      || self.value instanceof ast_function || self.value instanceof ast_class)
      || self.module_name || self.names) {
      output.semicolon()
    }
  })

  function parenthesize (root, output, noin) {
    let parens = false
    if (noin) {
      parens = observe(root, root => {
        if (root instanceof ast_scope && !(root instanceof ast_arrow)) return true
        if (root instanceof ast_binary && root.operator == 'in' || root instanceof ast_private_in) {
          return walk_abort
        }
      })
    }
    root.print(output, parens)
  }

  def_print(ast_var_def, function (self, output) {
    self.name.print(output)
    if (self.value) {
      output.space()
      output.print('=')
      output.space()
      const p = output.parent(1)
      const noin = p instanceof ast_for || p instanceof ast_for_in
      parenthesize(self.value, output, noin)
    }
  })
  def_print(ast_call, function (self, output) {
    self.expr.print(output)
    if (self instanceof ast_new && self.args.length === 0) return
    if (self.expr instanceof ast_call || self.expr instanceof ast_lambda) output.add_mapping(self.start)
    if (self.optional) output.print('?.')
    output.with_parens(function () {
      self.args.forEach(function (expr, i) {
        if (i) output.comma()
        expr.print(output)
      })
    })
  })
  def_print(ast_new, function (self, output) {
    output.print('new')
    output.space()
    ast_call.prototype.codegen(self, output)
  })
  ast_sequence.prototype._do_print = function (output) {
    this.expressions.forEach(function (root, index) {
      if (index > 0) {
        output.comma()
        if (output.should_break()) {
          output.newline()
          output.indent()
        }
      }
      root.print(output)
    })
  }
  def_print(ast_sequence, function (self, output) {
    const p = output.parent()
    if (p instanceof ast_state) {
      output.with_indent(output.next_indent(), function () { self._do_print(output) })
    } else {
      self._do_print(output)
    }
  })
  def_print(ast_dot, function (self, output) {
    const expr = self.expr
    expr.print(output)
    const prop = self.property
    const print_computed = all_reserved_words.has(prop) ? false : !is_identifier_string(prop, true)
    if (self.optional) output.print('?.')
    if (print_computed) {
      output.print('[')
      output.add_mapping(self.end)
      output.print_string(prop)
      output.print(']')
    } else {
      if (expr instanceof ast_number && expr.getValue() >= 0 && !/[xa-f.)]/i.test(output.last())) output.print('.')
      if (!self.optional) output.print('.')
      output.add_mapping(self.end)
      output.print_name(prop)
    }
  })
  def_print(ast_dot_hash, function (self, output) {
    const expr = self.expr
    expr.print(output)
    const prop = self.property
    if (self.optional) output.print('?')
    output.print('.#')
    output.add_mapping(self.end)
    output.print_name(prop)
  })
  def_print(ast_sub, function (self, output) {
    self.expr.print(output)
    if (self.optional) output.print('?.')
    output.print('[')
    self.property.print(output)
    output.print(']')
  })
  def_print(ast_chain, function (self, output) {
    self.expr.print(output)
  })
  def_print(ast_unary_prefix, function (self, output) {
    const op = self.operator
    if (op == '--' && output.last().endsWith('!')) output.print(' ')
    output.print(op)
    if (/^[a-z]/i.test(op) || (/[+-]$/.test(op) && self.expr instanceof ast_unary_prefix
        && /^[+-]/.test(self.expr.operator))) output.space()
    self.expr.print(output)
  })
  def_print(ast_unary_postfix, function (self, output) {
    self.expr.print(output)
    output.print(self.operator)
  })
  def_print(ast_binary, function (self, output) {
    const op = self.operator
    self.left.print(output)
    output.space()
    output.print(op)
    output.space()
    self.right.print(output)
  })
  def_print(ast_conditional, function (self, output) {
    self.condition.print(output)
    output.space()
    output.print('?')
    output.space()
    self.consequent.print(output)
    output.space()
    output.colon()
    self.alt.print(output)
  })
  def_print(ast_array, function (self, output) {
    output.with_square(function () {
      const a = self.elements, len = a.length
      if (len > 0) output.space()
      a.forEach(function (expr, i) {
        if (i) output.comma()
        expr.print(output)
        if (i === len - 1 && expr instanceof ast_hole) output.comma()
      })
      if (len > 0) output.space()
    })
  })
  def_print(ast_object, function (self, output) {
    if (self.properties.length > 0) output.with_block(function () {
      self.properties.forEach(function (prop, i) {
        if (i) {
          output.print(',')
          output.newline()
        }
        output.indent()
        prop.print(output)
      })
    })
    else {
      print_braced_empty(self, output)
    }
  })
  def_print(ast_class, function (self, output) {
    output.print('class')
    output.space()
    if (self.name) {
      self.name.print(output)
      output.space()
    }
    if (self.extends) {
      const parens = (!(self.extends instanceof ast_symbol_ref)
        && !(self.extends instanceof ast_prop_access)
        && !(self.extends instanceof ast_class_expression)
        && !(self.extends instanceof ast_function)
      )
      output.print('extends')
      parens ? output.print('(') : output.space()
      self.extends.print(output)
      parens ? output.print(')') : output.space()
    }
    if (self.properties.length > 0) {
      output.with_block(function () {
        self.properties.forEach(function (prop, i) {
          if (i) output.newline()
          output.indent()
          prop.print(output)
        })
        output.newline()
      })
    } else {
      output.print('{}')
    }
  })
  def_print(ast_new_target, function (self, output) {
    output.print('new.target')
  })

  function print_property_name (key, quote, output) {
    if (output.options['quote_keys']) {
      output.print_string(key)
      return false
    }
    if ('' + +key == key && key >= 0) {
      if (output.options['keep_numbers']) {
        output.print(key)
        return false
      }
      output.print(make_num(key))
      return false
    }
    const print_string = all_reserved_words.has(key) ? false : !is_identifier_string(key, true)
    if (print_string || (quote && output.options['keep_quoted_props'])) {
      output.print_string(key, quote)
      return false
    }
    output.print_name(key)
    return true
  }

  def_print(ast_key_value, function (self, output) {
    function get_name (self) {
      const defined = self.defined()
      return defined ? defined.mangled_name || defined.name : self.name
    }
    const try_shorthand = output.options['shorthand'] && !(self.key instanceof tree)
    if (try_shorthand && self.value instanceof ast_symbol && get_name(self.value) === self.key
      && !all_reserved_words.has(self.key)) {
      const was_shorthand = print_property_name(self.key, self.quote, output)
      if (!was_shorthand) {
        output.colon()
        self.value.print(output)
      }
    } else if (try_shorthand && self.value instanceof ast_default_assign
      && self.value.left instanceof ast_symbol
      && get_name(self.value.left) === self.key) {
      const was_shorthand = print_property_name(self.key, self.quote, output)
      if (!was_shorthand) {
        output.colon()
        self.value.left.print(output)
      }
      output.space()
      output.print('=')
      output.space()
      self.value.right.print(output)
    } else {
      if (!(self.key instanceof tree)) {
        print_property_name(self.key, self.quote, output)
      } else {
        output.with_square(function () { self.key.print(output) })
      }
      output.colon()
      self.value.print(output)
    }
  })
  def_print(ast_private_property, (self, output) => {
    if (self.static) {
      output.print('static')
      output.space()
    }
    output.print('#')
    print_property_name(self.key.name, self.quote, output)
    if (self.value) {
      output.print('=')
      self.value.print(output)
    }
    output.semicolon()
  })
  def_print(ast_class_property, (self, output) => {
    if (self.static) {
      output.print('static')
      output.space()
    }
    if (self.key instanceof ast_symbol_class_property) {
      print_property_name(self.key.name, self.quote, output)
    } else {
      output.print('[')
      self.key.print(output)
      output.print(']')
    }
    if (self.value) {
      output.print('=')
      self.value.print(output)
    }
    output.semicolon()
  })
  ast_object_property.prototype._print_getter_setter = function (type, is_private, output) {
    const self = this
    if (self.static) {
      output.print('static')
      output.space()
    }
    if (type) {
      output.print(type)
      output.space()
    }
    if (self.key instanceof ast_symbol_method) {
      if (is_private) output.print('#')
      print_property_name(self.key.name, self.quote, output)
      self.key.add_source_map(output)
    } else {
      output.with_square(function () {
        self.key.print(output)
      })
    }
    self.value._do_print(output, true)
  }
  def_print(ast_object_setter, function (self, output) {
    self._print_getter_setter('set', false, output)
  })
  def_print(ast_object_getter, function (self, output) {
    self._print_getter_setter('get', false, output)
  })
  def_print(ast_private_setter, function (self, output) {
    self._print_getter_setter('set', true, output)
  })
  def_print(ast_private_getter, function (self, output) {
    self._print_getter_setter('get', true, output)
  })
  def_print(ast_private_method, function (self, output) {
    let type
    if (self.gen && self.sync) {
      type = 'async*'
    } else if (self.gen) {
      type = '*'
    } else if (self.sync) {
      type = 'async'
    }
    self._print_getter_setter(type, true, output)
  })
  def_print(ast_private_in, function (self, output) {
    self.key.print(output)
    output.space()
    output.print('in')
    output.space()
    self.value.print(output)
  })
  def_print(ast_symbol_private_property, function (self, output) {
    output.print('#' + self.name)
  })
  def_print(ast_concise_method, function (self, output) {
    let type
    if (self.gen && self.sync) {
      type = 'async*'
    } else if (self.gen) {
      type = '*'
    } else if (self.sync) {
      type = 'async'
    }
    self._print_getter_setter(type, false, output)
  })
  def_print(ast_class_static, function (self, output) {
    output.print('static')
    output.space()
    print_braced(self, output)
  })
  ast_symbol.prototype._do_print = function (output) {
    const defined = this.defined()
    output.print_name(defined ? defined.mangled_name || defined.name : this.name)
  }
  def_print(ast_symbol, function (self, output) {
    self._do_print(output)
  })
  def_print(ast_hole, func)
  def_print(ast_this, function (self, output) {
    output.print('this')
  })
  def_print(ast_super, function (self, output) {
    output.print('super')
  })
  def_print(ast_literal, function (self, output) {
    output.print(self.getValue())
  })
  def_print(ast_string, function (self, output) {
    output.print_string(self.getValue(), self.quote, output.in_directive)
  })
  def_print(ast_number, function (self, output) {
    if ((output.options['keep_numbers'] || output.use_asm) && self.raw) {
      output.print(self.raw)
    } else {
      output.print(make_num(self.getValue()))
    }
  })
  def_print(ast_big_int, function (self, output) {
    output.print(self.getValue() + 'n')
  })

  const r_slash_script = /(<\s*\/\s*script)/i
  const r_starts_with_script = /^\s*script/i
  const slash_script_replace = (_, script) => script.replace('/', '\\/')

  def_print(ast_reg_exp, function (self, output) {
    let { source, flags } = self.getValue()
    source = source_regexp(source)
    flags = flags ? sort_regexp_flags(flags) : ''
    source = source.replace(r_slash_script, slash_script_replace)
    if (r_starts_with_script.test(source) && output.last().endsWith('<')) output.print(' ')
    output.print(output.to_utf8(`/${source}/${flags}`, false, true))
    const parent = output.parent()
    if (parent instanceof ast_binary && /^\w/.test(parent.operator) && parent.left === self) output.print(' ')
  })

  function print_maybe_braced_body (stat, output) {
    if (output.options['braces']) {
      make_block(stat, output)
    } else {
      if (!stat || stat instanceof ast_empty_statement) {
        output.force_semicolon()
      } else if (stat instanceof ast_let || stat instanceof ast_const || stat instanceof ast_class) {
        make_block(stat, output)
      } else {
        stat.print(output)
      }
    }
  }

  function best_of (a) {
    let best = a[0], len = best.length, i = 1, j = a.length
    for (; i < j; ++i) {
      if (a[i].length < len) {
        best = a[i]
        len = best.length
      }
    }
    return best
  }

  function make_num (num) {
    const string = num.toString(10).replace(/^0\./, '.').replace('e+', 'e')
    const strings = [string]
    if (Math.floor(num) === num) {
      num < 0 ? strings.push('-0x' + (-num).toString(16).toLowerCase()) : strings.push('0x' + num.toString(16).toLowerCase())
    }
    let match, len, digits
    if (match = /^\.0+/.exec(string)) {
      len = match[0].length
      digits = string.slice(len)
      strings.push(digits + 'e-' + (digits.length + len - 1))
    } else if (match = /0+$/.exec(string)) {
      len = match[0].length
      strings.push(string.slice(0, -len) + 'e' + len)
    } else if (match = /^(\d)\.(\d+)e(-?\d+)$/.exec(string)) {
      strings.push(match[1] + match[2] + 'e' + (match[3] - match[2].length))
    }
    return best_of(strings)
  }

  function make_block (statement, output) {
    if (!statement || statement instanceof ast_empty_statement) {
      output.print('{}')
    } else if (statement instanceof ast_block_statement) {
      statement.print(output)
    } else {
      output.with_block(function () {
        output.indent()
        statement.print(output)
        output.newline()
      })
    }
  }
}

function defmap (nodetype, generator) {
  nodetype.forEach(function (nodetype) {
    nodetype.prototype.add_source_map = generator
  })
}

defmap([ tree, ast_labeled_statement, ast_toplevel ], func)
defmap([ ast_array, ast_block_statement, ast_catch, ast_class, ast_literal, ast_debugger,
  ast_definitions, ast_directive, ast_finally, ast_jump, ast_lambda, ast_new, ast_object,
  ast_statement_with_body, ast_symbol, ast_switch, ast_switch_branch, ast_template_string,
  ast_template_segment, ast_try ], function (output) { output.add_mapping(this.start) })
defmap([ ast_object_getter, ast_object_setter, ast_private_getter, ast_private_setter,
  ast_concise_method, ast_private_method ], function (output) { output.add_mapping(this.start, false) })
defmap([ ast_symbol_method, ast_symbol_private_property ], function (output) {
  const tok_type = this.end && this.end.type
  output.add_mapping(this.end, (tok_type == 'name' || tok_type == 'privatename') && this.name)
})
defmap([ ast_object_property ], function (output) {
  output.add_mapping(this.start, this.key)
})

const unused_flag = 1
const true_flag = 2
const false_flag = 4
const undefined_flag = 8
const inlined_flag = 16
const write_only_flag = 32
const squeezed_flag = 256
const optimized_flag = 512
const topped_flag = 1024
const pass_flag = squeezed_flag | optimized_flag | topped_flag

const has_flag = (root, flag) => root.flags & flag
const set_flag = (root, flag) => { root.flags |= flag }
const clear_flag = (root, flag) => { root.flags &= ~flag }

function trim (nodes, comp, first_in_statement) {
  const len = nodes.length
  if (!len) return null
  const result = []
  let changed = false, root
  for (let i = 0; i < len; i++) {
    root = nodes[i].drop(comp, first_in_statement)
    changed |= root !== nodes[i]
    if (root) {
      result.push(root)
      first_in_statement = false
    }
  }
  return changed ? result.length ? result : null : nodes
}

tree.prototype.drop = return_this
ast_literal.prototype.drop = return_null
ast_this.prototype.drop = return_null
ast_call.prototype.drop = function (comp, first_in_statement) {
  if (is_nullish_shortcircuited(this, comp)) return this.expr.drop(comp, first_in_statement)
  if (!this.is_callee_pure(comp)) {
    if (this.expr.is_call_pure(comp)) {
      let exprs = this.args.slice()
      exprs.unshift(this.expr.expr)
      exprs = trim(exprs, comp, first_in_statement)
      return exprs && make_sequence(this, exprs)
    }
    if (is_func_expr(this.expr) && (!this.expr.name || !this.expr.name.defined().references.length)) {
      const root = this.copy()
      root.expr.process_expression(false, comp)
      return root
    }
    return this
  }
  const args = trim(this.args, comp, first_in_statement)
  return args && make_sequence(this, args)
}
ast_accessor.prototype.drop = return_null
ast_function.prototype.drop = return_null
ast_arrow.prototype.drop = return_null
ast_class.prototype.drop = function (comp) {
  const with_effects = []
  if (this.is_self_referential() && this.has_side_effects(comp)) return this
  const trimmed_extends = this.extends && this.extends.drop(comp)
  if (trimmed_extends) with_effects.push(trimmed_extends)
  for (const prop of this.properties) {
    if (prop instanceof ast_class_static) {
      if (prop.has_side_effects(comp)) return this
    } else {
      const trimmed_prop = prop.drop(comp)
      if (trimmed_prop) with_effects.push(trimmed_prop)
    }
  }
  if (!with_effects.length) return null
  const exprs = make_sequence(this, with_effects)
  return this instanceof ast_def_class ? make_node(ast_statement, this, {body: exprs}) : exprs
}
ast_class_property.prototype.drop = function (comp) {
  const key = this.computed_key() && this.key.drop(comp)
  const value = this.static && this.value && this.value.drop(comp)
  if (key && value) return make_sequence(this, [key, value])
  return key || value || null
}
ast_binary.prototype.drop = function (comp, first_in_statement) {
  const right = this.right.drop(comp)
  if (!right) return this.left.drop(comp, first_in_statement)
  if (lazy_op.has(this.operator)) {
    if (right === this.right) return this
    const root = this.copy()
    root.right = right
    return root
  } else {
    const left = this.left.drop(comp, first_in_statement)
    if (!left) return this.right.drop(comp, first_in_statement)
    return make_sequence(this, [left, right])
  }
}
ast_assign.prototype.drop = function (comp) {
  if (this.logical) return this
  let left = this.left
  if (left.has_side_effects(comp) && left instanceof ast_prop_access && left.expr.is_constant()) return this
  set_flag(this, write_only_flag)
  while (left instanceof ast_prop_access) left = left.expr
  if (left.is_constant_expression(comp.find_parent(ast_scope))) return this.right.drop(comp)
  return this
}
ast_conditional.prototype.drop = function (comp) {
  const right = this.consequent.drop(comp)
  const alt = this.alt.drop(comp)
  if (right === this.consequent && alt === this.alt) return this
  if (!right) return alt ? make_node(ast_binary, this, {operator: '||', left: this.condition, right: alt}) : this.condition.drop(comp)
  if (!alt) return make_node(ast_binary, this, {operator: '&&', left: this.condition, right})
  const root = this.copy()
  root.consequent = right
  root.alt = alt
  return root
}
ast_unary.prototype.drop = function (comp, first_in_statement) {
  if (unary_side_effects.has(this.operator)) {
    !this.expr.has_side_effects(comp) ? set_flag(this, write_only_flag) : clear_flag(this, write_only_flag)
    return this
  }
  if (this.operator == 'typeof' && this.expr instanceof ast_symbol_ref) return null
  const expr = this.expr.drop(comp, first_in_statement)
  if (first_in_statement && expr && is_iife_call(expr)) {
    if (expr === this.expr && this.operator == '!') return this
    return expr.negate(comp, first_in_statement)
  }
  return expr
}
ast_symbol_ref.prototype.drop = function (comp) {
  const safe_access = this.is_declared(comp) || safe_globals.has(this.name)
  return safe_access ? null : this
}
ast_object.prototype.drop = function (comp, first_in_statement) {
  const values = trim(this.properties, comp, first_in_statement)
  return values && make_sequence(this, values)
}
ast_object_property.prototype.drop = function (comp, first_in_statement) {
  const computed_key = this instanceof ast_key_value && this.key instanceof tree
  const key = computed_key && this.key.drop(comp, first_in_statement)
  const value = this.value && this.value.drop(comp, first_in_statement)
  if (key && value) return make_sequence(this, [key, value])
  return key || value
}
ast_concise_method.prototype.drop = function () {
  return this.computed_key() ? this.key : null
}
ast_object_getter.prototype.drop = function () {
  return this.computed_key() ? this.key : null
}
ast_object_setter.prototype.drop = function () {
  return this.computed_key() ? this.key : null
}
ast_array.prototype.drop = function (comp, first_in_statement) {
  const values = trim(this.elements, comp, first_in_statement)
  return values && make_sequence(this, values)
}
ast_dot.prototype.drop = function (comp, first_in_statement) {
  if (is_nullish_shortcircuited(this, comp)) return this.expr.drop(comp, first_in_statement)
  if (!this.optional && this.expr.may_throw_on_access(comp)) return this
  return this.expr.drop(comp, first_in_statement)
}
ast_sub.prototype.drop = function (comp, first_in_statement) {
  if (is_nullish_shortcircuited(this, comp)) return this.expr.drop(comp, first_in_statement)
  if (!this.optional && this.expr.may_throw_on_access(comp)) return this
  const property = this.property.drop(comp)
  if (property && this.optional) return this
  const expr = this.expr.drop(comp, first_in_statement)
  if (expr && property) return make_sequence(this, [expr, property])
  return expr || property
}
ast_chain.prototype.drop = function (comp, first_in_statement) {
  return this.expr.drop(comp, first_in_statement)
}
ast_sequence.prototype.drop = function (comp) {
  const last = this.tail_node()
  const expr = last.drop(comp)
  if (expr === last) return this
  const expressions = this.expressions.slice(0, -1)
  if (expr) expressions.push(expr)
  if (!expressions.length) return make_node(ast_number, this, {value: 0})
  return make_sequence(this, expressions)
}
ast_spread.prototype.drop = function (comp, first_in_statement) {
  return this.expr.drop(comp, first_in_statement)
}
ast_template_segment.prototype.drop = return_null
ast_template_string.prototype.drop = function (comp) {
  const values = trim(this.segments, comp, first_in_statement)
  return values && make_sequence(this, values)
}

const r_keep_assign = /keep_assign/
ast_scope.prototype.drop_unused = function (comp) {
  if (!comp.options['unused']) return
  if (comp.has_directive('use asm')) return
  if (!this.variables) return
  const self = this
  if (self.pinned()) return
  const drop_funcs = !(self instanceof ast_toplevel) || comp.toplevel.funcs
  const drop_vars = !(self instanceof ast_toplevel) || comp.toplevel.vars
  const assign_as_unused = r_keep_assign.test(comp.options['unused']) ? return_false : function (root) {
    if (root instanceof ast_assign && !root.logical && (has_flag(root, write_only_flag) || root.operator == '=')) return root.left
    if (root instanceof ast_unary && has_flag(root, write_only_flag)) return root.expr
  }
  const in_use_ids = new Map(), fixed_ids = new Map()
  if (self instanceof ast_toplevel && comp.top_retain) {
    self.variables.forEach(function (defined) {
      if (comp.top_retain(defined)) in_use_ids.set(defined.id, defined)
    })
  }
  const var_defs_by_id = new Map(), initializations = new Map(), self_referential_classes = new Set()
  let scope = this
  let trees = new observes(function (root, ascend) {
    if (root instanceof ast_lambda && root.uses_args) {
      root.argnames.forEach(function (argname) {
        if (!(argname instanceof ast_declaration)) return
        const defined = argname.defined()
        in_use_ids.set(defined.id, defined)
      })
    }
    if (root === self) return
    if (root instanceof ast_class && root.has_side_effects(comp)) {
      if (root.is_self_referential()) self_referential_classes.add(root)
      root.visit_nondeferred_class_parts(trees)
    }
    if (root instanceof ast_defun || root instanceof ast_def_class) {
      const node_def = root.name.defined()
      const in_= trees.parent() instanceof ast_export
      if (in_|| !drop_funcs && scope === self) {
        if (node_def.global) in_use_ids.set(node_def.id, node_def)
      }
      map_add(initializations, node_def.id, root)
      return true
    }
    const in_root_scope = scope === self
    if (root instanceof ast_symbol_funarg && in_root_scope) {
      map_add(var_defs_by_id, root.defined().id, root)
    }
    if (root instanceof ast_definitions && in_root_scope) {
      const in_= trees.parent() instanceof ast_export
      root.defs.forEach(function (defined) {
        if (defined.name instanceof ast_symbol_var) {
          map_add(var_defs_by_id, defined.name.defined().id, defined)
        }
        if (in_|| !drop_vars) {
          observe(defined.name, root => {
            if (root instanceof ast_declaration) {
              const defined = root.defined()
              if (defined.global) in_use_ids.set(defined.id, defined)
            }
          })
        }
        if (defined.name instanceof ast_destructure) defined.observe(trees)
        if (defined.name instanceof ast_declaration && defined.value) {
          const node_def = defined.name.defined()
          map_add(initializations, node_def.id, defined.value)
          if (!node_def.chained && defined.name.fixed_value() === defined.value) fixed_ids.set(node_def.id, defined)
          if (defined.value.has_side_effects(comp)) defined.value.observe(trees)
        }
      })
      return true
    }
    return scan_ref_scoped(root, ascend)
  })
  self.observe(trees)
  trees = new observes(scan_ref_scoped)
  in_use_ids.forEach(function (defined) {
    const init = initializations.get(defined.id)
    if (init) init.forEach(function (init) { init.observe(trees) })
  })
  self_referential_classes.forEach(function (cls) { cls.observe(trees) })
  const trans = new transforms(
    function before (root, ascend, list) {
      const parent = trans.parent()
      if (drop_vars) {
        const sym = assign_as_unused(root)
        if (sym instanceof ast_symbol_ref) {
          const defined = sym.defined()
          const in_use = in_use_ids.has(defined.id)
          if (root instanceof ast_assign) {
            if (!in_use || fixed_ids.has(defined.id) && fixed_ids.get(defined.id) !== root) {
              return maintain_bind(parent, root, root.right.transform(trans))
            }
          } else if (!in_use) {
            return list ? {} : make_node(ast_number, root, {value: 0})
          }
        }
      }
      if (scope !== self) return
      if (root.name && (root instanceof ast_class_expression || root instanceof ast_function)) {
        const defined = root.name.defined()
        if (!in_use_ids.has(defined.id) || defined.orig.length > 1) root.name = null
      }
      if (root instanceof ast_lambda && !(root instanceof ast_accessor)) {
        let trim = !comp.options['keep_fargs'], sym
        for (let a = root.argnames, i = a.length; --i >= 0;) {
          sym = a[i]
          if (sym instanceof ast_spread) sym = sym.expr
          if (sym instanceof ast_default_assign) sym = sym.left
          if (!(sym instanceof ast_destructure) && !in_use_ids.has(sym.defined().id)) {
            set_flag(sym, unused_flag)
            if (trim) a.pop()
          } else {
            trim = false
          }
        }
      }
      if (root instanceof ast_def_class && root !== self) {
        const defined = root.name.defined()
        ascend(root, this)
        const keep_class = defined.global && !drop_funcs || in_use_ids.has(defined.id)
        if (!keep_class) {
          const kept = root.drop(comp)
          if (kept == null) {
            defined.eliminated++
            return list ? {} : make_node(ast_empty_statement, root)
          }
          return kept
        }
        return root
      }
      if (root instanceof ast_defun && root !== self) {
        const defined = root.name.defined()
        const keep = defined.global && !drop_funcs || in_use_ids.has(defined.id)
        if (!keep) {
          defined.eliminated++
          return list ? {} : make_node(ast_empty_statement, root)
        }
      }
      if (root instanceof ast_definitions && !(parent instanceof ast_for_in && parent.init === root)) {
        const drop_block = !(parent instanceof ast_toplevel) && !(root instanceof ast_var)
        const body = [], head = [], tail = []
        let side_effects = []
        root.defs.forEach(function (defined) {
          if (defined.value) defined.value = defined.value.transform(trans)
          const is_destructure = defined.name instanceof ast_destructure
          const sym = is_destructure ? new symbol_def(null, {name: 'destructure'}) : defined.name.defined()
          if (drop_block && sym.global) return tail.push(defined)
          if (!(drop_vars || drop_block) || is_destructure
            && (defined.name.names.length || defined.name.is_array || comp.options['pure_getters'] != true) || in_use_ids.has(sym.id)) {
            if (defined.value && fixed_ids.has(sym.id) && fixed_ids.get(sym.id) !== defined) defined.value = defined.value.drop(comp)
            if (defined.name instanceof ast_symbol_var) {
              const var_defs = var_defs_by_id.get(sym.id)
              if (var_defs.length > 1 && (!defined.value || sym.orig.indexOf(defined.name) > sym.eliminated)) {
                if (defined.value) {
                  const ref = make_node(ast_symbol_ref, defined.name, defined.name)
                  sym.references.push(ref)
                  const assign = make_node(ast_assign, defined, {operator: '=', logical: false, left: ref, right: defined.value})
                  if (fixed_ids.get(sym.id) === defined) fixed_ids.set(sym.id, assign)
                  side_effects.push(assign.transform(trans))
                }
                remove(var_defs, defined)
                sym.eliminated++
                return
              }
            }
            if (defined.value) {
              if (side_effects.length > 0) {
                if (tail.length > 0) {
                  side_effects.push(defined.value)
                  defined.value = make_sequence(defined.value, side_effects)
                } else {
                  body.push(make_node(ast_statement, root, {body: make_sequence(root, side_effects)}))
                }
                side_effects = []
              }
              tail.push(defined)
            } else {
              head.push(defined)
            }
          } else if (sym.orig[0] instanceof ast_symbol_catch) {
            const value = defined.value && defined.value.drop(comp)
            if (value) side_effects.push(value)
            defined.value = null
            head.push(defined)
          } else {
            const value = defined.value && defined.value.drop(comp)
            if (value) side_effects.push(value)
            sym.eliminated++
          }
        })
        if (head.length > 0 || tail.length > 0) {
          root.defs = head.concat(tail)
          body.push(root)
        }
        if (side_effects.length > 0) {
          body.push(make_node(ast_statement, root, {body: make_sequence(root, side_effects)}))
        }
        switch (body.length) {
          case 0:
          return list ? {} : make_node(ast_empty_statement, root)
          case 1:
          return body[0]
          default:
          return list ? _splice(body) : make_node(ast_block_statement, root, {body})
        }
      }
      if (root instanceof ast_for) {
        ascend(root, this)
        let block
        if (root.init instanceof ast_block_statement) {
          block = root.init
          root.init = block.body.pop()
          block.body.push(root)
        }
        if (root.init instanceof ast_statement) {
          root.init = root.init.body
        } else if (is_empty(root.init)) {
          root.init = null
        }
        return !block ? root : list ? _splice(block.body) : block
      }
      if (root instanceof ast_labeled_statement
        && root.body instanceof ast_for) {
        ascend(root, this)
        if (root.body instanceof ast_block_statement) {
          const block = root.body
          root.body = block.body.pop()
          block.body.push(root)
          return list ? _splice(block.body) : block
        }
        return root
      }
      if (root instanceof ast_block_statement) {
        ascend(root, this)
        if (list && root.body.every(evictable)) return _splice(root.body)
        return root
      }
      if (root instanceof ast_scope && !(root instanceof ast_class_static)) {
        const save_scope = scope
        scope = root
        ascend(root, this)
        scope = save_scope
        return root
      }
    }
  )

  self.transform(trans)

  function scan_ref_scoped (root, ascend) {
    let node_def
    const sym = assign_as_unused(root)
    const node_name = sym ? sym.file + '/' + sym.name : ''
    if (sym instanceof ast_symbol_ref && !ref_of(root.left, ast_symbol_block)
      && self.variables.get(node_name) === (node_def = sym.defined())) {
      if (root instanceof ast_assign) {
        root.right.observe(trees)
        if (!node_def.chained && root.left.fixed_value() === root.right) fixed_ids.set(node_def.id, root)
      }
      return true
    }
    if (root instanceof ast_symbol_ref) {
      node_def = root.defined()
      if (!in_use_ids.has(node_def.id)) {
        in_use_ids.set(node_def.id, node_def)
        if (node_def.orig[0] instanceof ast_symbol_catch) {
          const node_name = node_def.file + '/' + node_def.name
          const redef = node_def.scope.is_block_scope() && node_def.scope.get_defun_scope().variables.get(node_name)
          if (redef) in_use_ids.set(redef.id, redef)
        }
      }
      return true
    }
    if (root instanceof ast_class) {
      ascend()
      return true
    }
    if (root instanceof ast_scope && !(root instanceof ast_class_static)) {
      const save_scope = scope
      scope = root
      ascend()
      scope = save_scope
      return true
    }
  }
}

function loop_body (x) {
  if (x instanceof ast_iteration_statement) return x.body instanceof ast_block_statement ? x.body : x
  return x
}

function is_lhs_read_only (lhs) {
  if (lhs instanceof ast_this) return true
  if (lhs instanceof ast_symbol_ref) return lhs.defined().orig[0] instanceof ast_symbol_lambda
  if (lhs instanceof ast_prop_access) {
    lhs = lhs.expr
    if (lhs instanceof ast_symbol_ref) {
      if (lhs.is_immutable()) return false
      lhs = lhs.fixed_value()
    }
    if (!lhs) return true
    if (lhs instanceof ast_reg_exp) return false
    if (lhs instanceof ast_literal) return true
    return is_lhs_read_only(lhs)
  }
  return false
}

function remove_initializers (var_statement) {
  const decls = []
  var_statement.defs.forEach(function (defined) {
    if (defined.name instanceof ast_declaration) {
      defined.value = null
      decls.push(defined)
    } else {
      defined.declarations_as_names().forEach(name => {
        decls.push(make_node(ast_var_def, defined, {
          name,
          value: null
        }))
      })
    }
  })
  return decls.length ? make_node(ast_var, var_statement, {defs: decls}) : null
}

function trim_code (comp, stat, target) {
  observe(stat, root => {
    if (root instanceof ast_var) {
      const no_initializers = remove_initializers(root)
      if (no_initializers) target.push(no_initializers)
      return true
    }
    if (root instanceof ast_defun) {
      target.push(root === stat ? root : make_node(ast_var, root, {
        defs: [
          make_node(ast_var_def, root, {
            name: make_node(ast_symbol_var, root.name, root.name),
            value: null
          })
        ]
      }))
      return true
    }
    if (root instanceof ast_export || root instanceof ast_import) {
      target.push(root)
      return true
    }
    if (root instanceof ast_scope) return true
  })
}

function tighten_body (statements, comp) {
  const nearest_scope = comp.find_scope()
  const defun_scope = nearest_scope.get_defun_scope()
  const { in_loop, in_try } = find_loop_scope_try()
  let changed, max_iter = 10
  do {
    changed = false
    eliminate_spurious_blocks(statements)
    if (comp.options['dead_code']) eliminate_dead_code(statements, comp)
    if (comp.options['if_return'])  handle_if_return(statements, comp)
    if (comp.sequences_limit > 0) {
      sequencesize(statements, comp)
      sequencesize_2(statements, comp)
    }
    if (comp.options['join_vars']) join_consecutive_vars(statements)
    if (comp.options['collapse_vars']) collapse(statements, comp)
  } while (changed && max_iter-- > 0)

  function find_loop_scope_try () {
    let root = comp.self(), level = 0, in_loop = false, in_try = false
    do {
      if (root instanceof ast_iteration_statement) {
        in_loop = true
      } else if (root instanceof ast_scope) {
        break
      } else if (root instanceof ast_try_block) {
        in_try = true
      }
    } while (root = comp.parent(level++))
    return {in_loop, in_try}
  }

  function collapse (statements, comp) {
    if (nearest_scope.pinned() || defun_scope.pinned()) return statements
    const candidates = []
    let stat_index = statements.length, args
    const scanner = new transforms(function (root) {
      if (abort) return root
      if (!hit) {
        if (root !== hit_stack[hit_index]) return root
        hit_index++
        if (hit_index < hit_stack.length) return handle_custom_scan_order(root)
        hit = true
        stop_after = find_stop(root, 0)
        if (stop_after === root) abort = true
        return root
      }
      const parent = scanner.parent()
      if (root instanceof ast_assign && (root.logical || root.operator != '=' && lhs.equivalent_to(root.left))
        || (root instanceof ast_await && !(root instanceof ast_spread))
        || root instanceof ast_call && lhs instanceof ast_prop_access && lhs.equivalent_to(root.expr)
        || (root instanceof ast_call || root instanceof ast_prop_access) && root.optional
        || root instanceof ast_debugger || root instanceof ast_destructure
        || root instanceof ast_spread && root.expr instanceof ast_symbol && (root.expr instanceof ast_this || root.expr.defined().references.length > 1)
        || root instanceof ast_iteration_statement && !(root instanceof ast_for)
        || root instanceof ast_loop_control || root instanceof ast_try || root instanceof ast_with
        || root instanceof ast_yield || root instanceof ast_export || root instanceof ast_class
        || parent instanceof ast_for && root !== parent.init
        || !replace_all && (root instanceof ast_symbol_ref && !root.is_declared(comp) && !safe_globals.has(root))
        || root instanceof ast_symbol_ref && parent instanceof ast_call && has_annotation(parent, _noinline)
        || root instanceof ast_object_property && root.key instanceof tree) {
        abort = true
        return root
      }
      if (!stop_if_hit && (!lhs_local || !replace_all) && (parent instanceof ast_binary && lazy_op.has(parent.operator)
          && parent.left !== root || parent instanceof ast_conditional && parent.condition !== root
          || parent instanceof ast_if && parent.condition !== root)) {
        stop_if_hit = parent
      }
      if (can_replace && !(root instanceof ast_declaration)
        && lhs.equivalent_to(root) && !shadows(scanner.find_scope() || nearest_scope, lvalues)) {
        if (stop_if_hit) {
          abort = true
          return root
        }
        if (is_lhs(root, parent)) {
          if (value_def) replaced++
          return root
        } else {
          replaced++
          if (value_def && candidate instanceof ast_var_def) return root
        }
        changed = abort = true
        if (candidate instanceof ast_unary_postfix) return make_node(ast_unary_prefix, candidate, candidate)
        if (candidate instanceof ast_var_def) {
          const defined = candidate.name.defined()
          const value = candidate.value
          if (defined.references.length - defined.replaced == 1 && !comp.exposed(defined)) {
            defined.replaced++
            return funarg && is_identifier_atom(value) ? value.transform(comp) : maintain_bind(parent, root, value)
          }
          return make_node(ast_assign, candidate, {operator: '=', logical: false,
            left: make_node(ast_symbol_ref, candidate.name, candidate.name), right: value})
        }
        clear_flag(candidate, write_only_flag)
        return candidate
      }
      let sym
      if (root instanceof ast_call || root instanceof ast_exit && (side_effects || lhs instanceof ast_prop_access || may_modify(lhs))
        || root instanceof ast_prop_access && (side_effects || root.expr.may_throw_on_access(comp))
        || root instanceof ast_symbol_ref && ((lvalues.has(root.name) && lvalues.get(root.name).modified) || side_effects && may_modify(root))
        || root instanceof ast_var_def && root.value  && (lvalues.has(root.name.name) || side_effects && may_modify(root.name))
        || (sym = is_lhs(root.left, root)) && (sym instanceof ast_prop_access || lvalues.has(sym.name))
        || may_throw && (in_try ? root.has_side_effects(comp) : side_effects_external(root))) {
        stop_after = root
        if (root instanceof ast_scope) abort = true
      }
      return handle_custom_scan_order(root)
    }, function (root) {
      if (abort) return
      if (stop_after === root) abort = true
      if (stop_if_hit === root) stop_if_hit = null
    })
    let hit_stack = [], hit_index, candidate, value_def, stop_after, stop_if_hit, lhs, lvalues, lhs_local
    let side_effects, replace_all, may_throw, funarg, hit, abort, replaced, can_replace
    const multi_replacer = new transforms(function (root) {
      if (abort) return root
      if (!hit) {
        if (root !== hit_stack[hit_index]) return root
        hit_index++
        if (hit_index < hit_stack.length) return
        hit = true
        return root
      }
      if (root instanceof ast_symbol_ref && root.name == defined.name) {
        if (!--replaced) abort = true
        if (is_lhs(root, multi_replacer.parent())) return root
        defined.replaced++
        value_def.replaced--
        return candidate.value
      }
      if (root instanceof ast_default || root instanceof ast_scope) return root
    })

    while (--stat_index >= 0) {
      if (stat_index == 0 && comp.options['unused']) extract_args()
      extract(statements[stat_index])
      while (candidates.length > 0) {
        hit_stack = candidates.pop()
        hit_index = 0
        candidate = hit_stack[hit_stack.length - 1]
        value_def = null
        stop_after = null
        stop_if_hit = null
        lhs = get_lhs(candidate)
        if (!lhs || is_lhs_read_only(lhs) || lhs.has_side_effects(comp)) continue
        lvalues = get_lvalues(candidate)
        lhs_local = is_lhs_local(lhs)
        if (lhs instanceof ast_symbol_ref) lvalues.set(lhs.name, { defined: lhs.defined(), modified: false})
        side_effects = value_has_side_effects(candidate)
        replace_all = replace_all_symbols()
        may_throw = candidate.may_throw(comp)
        funarg = candidate.name instanceof ast_symbol_funarg
        hit = funarg
        abort = false
        replaced = 0
        can_replace = !args || !hit
        if (!can_replace) {
          for (let j = comp.self().argnames.lastIndexOf(candidate.name) + 1; !abort && j < args.length; j++) {
            args[j].transform(scanner)
          }
          can_replace = true
        }
        for (let i = stat_index, len = statements.length; !abort && i < len; i++) {
          statements[i].transform(scanner)
        }
        if (value_def) {
          const defined = candidate.name.defined()
          if (abort && defined.references.length - defined.replaced > replaced) replaced = false
          else {
            abort = false
            hit_index = 0
            hit = funarg
            for (let i = stat_index, len = statements.length; !abort && i < len; i++) {
              statements[i].transform(multi_replacer)
            }
            value_def.single_use = false
          }
        }
        if (replaced && !remove_candidate(candidate)) statements.splice(stat_index, 1)
      }
    }

    function handle_custom_scan_order (root) {
      if (root instanceof ast_scope) return root
      if (root instanceof ast_switch) {
        root.expr = root.expr.transform(scanner)
        let i = 0, len = root.body.length, branch
        for (i; !abort && i < len; i++) {
          branch = root.body[i]
          if (branch instanceof ast_case) {
            if (!hit) {
              if (branch !== hit_stack[hit_index]) continue
              hit_index++
            }
            branch.expr = branch.expr.transform(scanner)
            if (!replace_all) break
          }
        }
        abort = true
        return root
      }
    }

    function redefined_within_scope (defined, scope) {
      if (defined.global) return false
      let cur_scope = defined.scope, name
      while (cur_scope && cur_scope !== scope) {
        name = defined.file + '/' + defined.name
        if (cur_scope.variables.has(name)) return true
        cur_scope = cur_scope.parents
      }
      return false
    }

    function has_overlapping_symbol (fn, arg, fn_strict) {
      let found = false, scan_this = !(fn instanceof ast_arrow)
      arg.observe(new observes(function (root, ascend) {
        if (found) return true
        const name = root.file + '/' + root.name
        if (root instanceof ast_symbol_ref && (fn.variables.has(name) || redefined_within_scope(root.defined(), fn))) {
          let scope = root.defined().scope
          if (scope !== defun_scope) while (scope = scope.parents) if (scope === defun_scope) return true
          return found = true
        }
        if ((fn_strict || scan_this) && root instanceof ast_this) return found = true
        if (root instanceof ast_scope && !(root instanceof ast_arrow)) {
          const prev = scan_this
          scan_this = false
          ascend()
          scan_this = prev
          return true
        }
      }))
      return found
    }

    function arg_is_injectable (arg) {
      if (arg instanceof ast_spread) return false
      const contains_await = observe(arg, (root) => { if (root instanceof ast_await) return walk_abort })
      if (contains_await) return false
      return true
    }
    function extract_args () {
      const fn = comp.self()
      let iife
      if (is_func_expr(fn) && !fn.name && !fn.uses_args && !fn.pinned() && (iife = comp.parent()) instanceof ast_call
        && iife.expr === fn && iife.args.every(arg_is_injectable)) {
        const len = fn.argnames.length
        args = iife.args.slice(len)
        const names = new Set()
        let sym, arg, defined, is_reassigned, elements
        for (let i = len; --i >= 0;) {
          sym = fn.argnames[i]
          arg = iife.args[i]
          defined = sym.defined && sym.defined()
          is_reassigned = defined && defined.orig.length > 1
          if (is_reassigned) continue
          args.unshift(make_node(ast_var_def, sym, {name: sym, value: arg}))
          if (names.has(sym.name)) continue
          names.add(sym.name)
          if (sym instanceof ast_spread) {
            elements = iife.args.slice(i)
            if (elements.every((arg) => !has_overlapping_symbol(fn, arg, false))) {
              candidates.unshift([make_node(ast_var_def, sym, {name: sym.expr, value: make_node(ast_array, iife, {elements})})])
            }
          } else {
            if (!arg) {
              arg = make_node(ast_undefined, sym).transform(comp)
            } else if (arg instanceof ast_lambda && arg.pinned() || has_overlapping_symbol(fn, arg, false)) {
              arg = null
            }
            if (arg) candidates.unshift([make_node(ast_var_def, sym, {name: sym, value: arg})])
          }
        }
      }
    }

    function extract (expr) {
      hit_stack.push(expr)
      if (expr instanceof ast_assign) {
        if (!expr.left.has_side_effects(comp) && !(expr.right instanceof ast_chain)) candidates.push(hit_stack.slice())
        extract(expr.right)
      } else if (expr instanceof ast_binary) {
        extract(expr.left)
        extract(expr.right)
      } else if (expr instanceof ast_call && !has_annotation(expr, _noinline)) {
        extract(expr.expr)
        expr.args.forEach(extract)
      } else if (expr instanceof ast_case) {
        extract(expr.expr)
      } else if (expr instanceof ast_conditional) {
        extract(expr.condition)
        extract(expr.consequent)
        extract(expr.alt)
      } else if (expr instanceof ast_definitions) {
        const len = expr.defs.length
        let i = len - 200
        if (i < 0) i = 0
        for (; i < len; i++) extract(expr.defs[i])
      } else if (expr instanceof ast_do_loop) {
        extract(expr.condition)
        if (!(expr.body instanceof ast_block)) extract(expr.body)
      } else if (expr instanceof ast_exit) {
        if (expr.value) extract(expr.value)
      } else if (expr instanceof ast_for) {
        if (expr.init) extract(expr.init)
        if (expr.condition) extract(expr.condition)
        if (expr.step) extract(expr.step)
        if (!(expr.body instanceof ast_block)) extract(expr.body)
      } else if (expr instanceof ast_for_in) {
        extract(expr.object)
        if (!(expr.body instanceof ast_block)) extract(expr.body)
      } else if (expr instanceof ast_if) {
        extract(expr.condition)
        if (!(expr.body instanceof ast_block)) extract(expr.body)
        if (expr.alt && !(expr.alt instanceof ast_block)) extract(expr.alt)
      } else if (expr instanceof ast_sequence) {
        expr.expressions.forEach(extract)
      } else if (expr instanceof ast_statement) {
        extract(expr.body)
      } else if (expr instanceof ast_switch) {
        extract(expr.expr)
        expr.body.forEach(extract)
      } else if (expr instanceof ast_unary) {
        if (expr.operator == '++' || expr.operator == '--') candidates.push(hit_stack.slice())
      } else if (expr instanceof ast_var_def) {
        if (expr.value && !(expr.value instanceof ast_chain)) {
          candidates.push(hit_stack.slice())
          extract(expr.value)
        }
      }
      hit_stack.pop()
    }

    function find_stop (root, level, write_only) {
      const parent = scanner.parent(level)
      if (parent instanceof ast_assign) {
        if (write_only && !parent.logical && !(parent.left instanceof ast_prop_access || lvalues.has(parent.left.name))) {
          return find_stop(parent, level + 1, write_only)
        }
        return root
      }
      if (parent instanceof ast_binary) {
        if (write_only && (!lazy_op.has(parent.operator) || parent.left === root)) {
          return find_stop(parent, level + 1, write_only)
        }
        return root
      }
      if (parent instanceof ast_call) return root
      if (parent instanceof ast_case) return root
      if (parent instanceof ast_conditional) {
        if (write_only && parent.condition === root) return find_stop(parent, level + 1, write_only)
        return root
      }
      if (parent instanceof ast_definitions) return find_stop(parent, level + 1, true)
      if (parent instanceof ast_exit) return write_only ? find_stop(parent, level + 1, write_only) : root
      if (parent instanceof ast_if) {
        if (write_only && parent.condition === root) return find_stop(parent, level + 1, write_only)
        return root
      }
      if (parent instanceof ast_iteration_statement) return root
      if (parent instanceof ast_sequence) return find_stop(parent, level + 1, parent.tail_node() !== root)
      if (parent instanceof ast_statement) return find_stop(parent, level + 1, true)
      if (parent instanceof ast_switch) return root
      if (parent instanceof ast_var_def) return root
      return null
    }

    function mangleable (var_def) {
      const value = var_def.value
      if (!(value instanceof ast_symbol_ref)) return
      if (value.name == 'arguments') return
      const defined = value.defined()
      if (defined.undeclared) return
      return value_def = defined
    }

    function get_lhs (expr) {
      if (expr instanceof ast_assign && expr.logical) {
        return false
      } else if (expr instanceof ast_var_def && expr.name instanceof ast_declaration) {
        const defined = expr.name.defined()
        if (!member(expr.name, defined.orig)) return
        const referenced = defined.references.length - defined.replaced
        if (!referenced) return
        const declared = defined.orig.length - defined.eliminated
        if (declared > 1 && !(expr.name instanceof ast_symbol_funarg) || (referenced > 1 ? mangleable(expr) : !comp.exposed(defined))) {
          return make_node(ast_symbol_ref, expr.name, expr.name)
        }
      } else {
        const lhs = expr instanceof ast_assign ? expr.left : expr.expr
        return !ref_of(lhs, ast_symbol_const) && !ref_of(lhs, ast_symbol_let) && lhs
      }
    }

    function get_rvalue (expr) {
      return expr instanceof ast_assign ? expr.right : expr.value
    }

    function get_lvalues (expr) {
      const lvalues = new Map()
      if (expr instanceof ast_unary) return lvalues
      const trees = new observes(function (root) {
        let sym = root
        while (sym instanceof ast_prop_access) sym = sym.expr
        if (sym instanceof ast_symbol_ref) {
          const prev = lvalues.get(sym.name)
          if (!prev || !prev.modified) {
            lvalues.set(sym.name, {
              defined: sym.defined(),
              modified: is_modified(comp, trees, root, root, 0)
            })
          }
        }
      })
      get_rvalue(expr).observe(trees)
      return lvalues
    }

    function remove_candidate (expr) {
      if (expr.name instanceof ast_symbol_funarg) {
        const iife = comp.parent(), argnames = comp.self().argnames
        const index = argnames.indexOf(expr.name)
        if (index < 0) {
          iife.args.length = Math.min(iife.args.length, argnames.length - 1)
        } else {
          const args = iife.args
          if (args[index]) args[index] = make_node(ast_number, args[index], {value: 0})
        }
        return true
      }
      let found = false
      return statements[stat_index].transform(new transforms(function (root, ascend, list) {
        if (found) return root
        if (root === expr || root.body === expr) {
          found = true
          if (root instanceof ast_var_def) {
            root.value = root.name instanceof ast_symbol_const ? make_node(ast_undefined, root.value) : null
            return root
          }
          return list ? {} : null
        }
      }, function (root) {
        if (root instanceof ast_sequence)
          switch (root.expressions.length) {
            case 0: return null
            case 1: return root.expressions[0]
          }
      }))
    }

    function is_lhs_local (lhs) {
      while (lhs instanceof ast_prop_access) lhs = lhs.expr
      return lhs instanceof ast_symbol_ref
        && lhs.defined().scope.get_defun_scope() === defun_scope
        && !(in_loop && (lvalues.has(lhs.name)
            || candidate instanceof ast_unary
            || (candidate instanceof ast_assign
              && !candidate.logical
              && candidate.operator != '=')))
    }

    function value_has_side_effects (expr) {
      if (expr instanceof ast_unary) return unary_side_effects.has(expr.operator)
      return get_rvalue(expr).has_side_effects(comp)
    }

    function replace_all_symbols () {
      if (side_effects) return false
      if (value_def) return true
      if (lhs instanceof ast_symbol_ref) {
        const defined = lhs.defined()
        if (defined.references.length - defined.replaced == (candidate instanceof ast_var_def ? 1 : 2)) return true
      }
      return false
    }

    function may_modify (sym) {
      if (!sym.defined) return true
      const defined = sym.defined()
      if (defined.orig.length == 1 && defined.orig[0] instanceof ast_symbol_defun) return false
      if (defined.scope.get_defun_scope() !== defun_scope) return true
      return defined.references.some((ref) => ref.scope.get_defun_scope() !== defun_scope)
    }

    function side_effects_external (root, lhs) {
      if (root instanceof ast_assign) return side_effects_external(root.left, true)
      if (root instanceof ast_unary) return side_effects_external(root.expr, true)
      if (root instanceof ast_var_def) return root.value && side_effects_external(root.value)
      if (lhs) {
        if (root instanceof ast_dot) return side_effects_external(root.expr, true)
        if (root instanceof ast_sub) return side_effects_external(root.expr, true)
        if (root instanceof ast_symbol_ref) return root.defined().scope.get_defun_scope() !== defun_scope
      }
      return false
    }

    function shadows (my_scope, lvalues) {
      for (const { defined } of lvalues.values()) {
        const node_name = defined.file + '/' + defined.name
        const looked_up = my_scope.find_variable(node_name, comp.imports)
        if (looked_up && looked_up !== defined) return true
      }
      return false
    }
  }

  function eliminate_spurious_blocks (statements) {
    const seen_dirs = []
    let stat
    for (let i = 0; i < statements.length;) {
      stat = statements[i]
      if (stat instanceof ast_block_statement && stat.body.every(evictable)) {
        changed = true
        eliminate_spurious_blocks(stat.body)
        statements.splice(i, 1, ...stat.body)
        i += stat.body.length
      } else if (stat instanceof ast_empty_statement) {
        changed = true
        statements.splice(i, 1)
      } else if (stat instanceof ast_directive) {
        if (seen_dirs.indexOf(stat.value) < 0) {
          i++
          seen_dirs.push(stat.value)
        } else {
          changed = true
          statements.splice(i, 1)
        }
      } else i++
    }
  }

  function handle_if_return (statements, comp) {
    const self = comp.self()
    const multiple_if_returns = has_multiple_if_returns(statements)
    const in_lambda = self instanceof ast_lambda
    const iteration_start = Math.min(statements.length, 500)
    let i, j, next, stat
    for (i = iteration_start; --i >= 0;) {
      j = next_index(i)
      next = statements[j]
      stat = statements[i]
      if (in_lambda && !next && stat instanceof ast_return) {
        if (!stat.value) {
          changed = true
          statements.splice(i, 1)
          continue
        }
        if (stat.value instanceof ast_unary_prefix && stat.value.operator == 'void') {
          changed = true
          statements[i] = make_node(ast_statement, stat, {
            body: stat.value.expr
          })
          continue
        }
      }

      if (stat instanceof ast_if) {
        let ab, new_else
        ab = aborts(stat.body)
        if (can_merge_flow(ab) && (new_else = as_statement_array_with_return(stat.body, ab))) {
          if (ab.label) remove(ab.label.thedef.references, ab)
          changed = true
          stat = stat.copy()
          stat.condition = stat.condition.negate(comp)
          stat.body = make_node(ast_block_statement, stat, {
            body: as_statement_array(stat.alt).concat(extract_functions())
          })
          stat.alt = make_node(ast_block_statement, stat, {body: new_else})
          statements[i] = stat.transform(comp)
          continue
        }
        ab = aborts(stat.alt)
        if (can_merge_flow(ab) && (new_else = as_statement_array_with_return(stat.alt, ab))) {
          if (ab.label) remove(ab.label.thedef.references, ab)
          changed = true
          stat = stat.copy()
          stat.body = make_node(ast_block_statement, stat.body, {
            body: as_statement_array(stat.body).concat(extract_functions())
          })
          stat.alt = make_node(ast_block_statement, stat.alt, {body: new_else})
          statements[i] = stat.transform(comp)
          continue
        }
      }

      if (stat instanceof ast_if && stat.body instanceof ast_return) {
        const value = stat.body.value
        if (!value && !stat.alt && (in_lambda && !next || next instanceof ast_return && !next.value)) {
          changed = true
          statements[i] = make_node(ast_statement, stat.condition, {body: stat.condition})
          continue
        }
        if (value && !stat.alt && next instanceof ast_return && next.value) {
          changed = true
          stat = stat.copy()
          stat.alt = next
          statements[i] = stat.transform(comp)
          statements.splice(j, 1)
          continue
        }
        if (value && !stat.alt && (!next && in_lambda && multiple_if_returns || next instanceof ast_return)) {
          changed = true
          stat = stat.copy()
          stat.alt = next || make_node(ast_return, stat, {value: null})
          statements[i] = stat.transform(comp)
          if (next) statements.splice(j, 1)
          continue
        }
        const prev = statements[prev_index(i)]
        if (comp.options['sequences'] && in_lambda && !stat.alt && prev instanceof ast_if
          && prev.body instanceof ast_return && next_index(j) == statements.length && next instanceof ast_statement) {
          changed = true
          stat = stat.copy()
          stat.alt = make_node(ast_block_statement, next, {
            body: [next, make_node(ast_return, next, {value: null})]
          })
          statements[i] = stat.transform(comp)
          statements.splice(j, 1)
          continue
        }
      }
    }

    function has_multiple_if_returns (statements) {
      let n = 0, i = statements.length, stat
      for (; --i >= 0;) {
        stat = statements[i]
        if (stat instanceof ast_if && stat.body instanceof ast_return) if (++n > 1) return true
      }
      return false
    }

    function is_return_void (value) {
      return !value || value instanceof ast_unary_prefix && value.operator == 'void'
    }

    function can_merge_flow (ab) {
      if (!ab) return false
      let j = i + 1, len = statements.length, stat
      for (; j < len; j++) {
        stat = statements[j]
        if (stat instanceof ast_const || stat instanceof ast_let) return false
      }
      const lct = ab instanceof ast_loop_control ? comp.loopcontrol(ab) : null
      return ab instanceof ast_return && in_lambda && is_return_void(ab.value)
        || ab instanceof ast_continue && self === loop_body(lct)
        || ab instanceof ast_break && lct instanceof ast_block_statement && self === lct
    }

    function extract_functions () {
      const tail = statements.slice(i + 1)
      statements.length = i + 1
      return tail.filter(function (stat) {
        if (stat instanceof ast_defun) {
          statements.push(stat)
          return false
        }
        return true
      })
    }

    function as_statement_array_with_return (root, ab) {
      let body = as_statement_array(root)
      if (ab !== body[body.length - 1]) return undefined
      body = body.slice(0, -1)
      if (ab.value) body.push(make_node(ast_statement, ab.value, {body: ab.value.expr}))
      return body
    }

    function next_index (i) {
      let j = i + 1, len = statements.length, stat
      for (; j < len; j++) {
        stat = statements[j]
        if (!(stat instanceof ast_var && declarations_only(stat))) break
      }
      return j
    }

    function prev_index (i) {
      let j = i, stat
      for (j = i; --j >= 0;) {
        stat = statements[j]
        if (!(stat instanceof ast_var && declarations_only(stat))) break
      }
      return j
    }
  }

  function eliminate_dead_code (statements, comp) {
    const self = comp.self()
    let i = 0, n = 0, len = statements.length, stat, lct, has_quit
    for (; i < len; i++) {
      stat = statements[i]
      if (stat instanceof ast_loop_control) {
        lct = comp.loopcontrol(stat)
        if (stat instanceof ast_break && !(lct instanceof ast_iteration_statement) && loop_body(lct) === self
          || stat instanceof ast_continue && loop_body(lct) === self) {
          if (stat.label) remove(stat.label.thedef.references, stat)
        } else {
          statements[n++] = stat
        }
      } else {
        statements[n++] = stat
      }
      if (aborts(stat)) {
        has_quit = statements.slice(i + 1)
        break
      }
    }
    statements.length = n
    changed = n != len
    if (has_quit) has_quit.forEach(function (stat) { trim_code(comp, stat, statements) })
  }

  function declarations_only (root) {
    return root.defs.every((var_def) => !var_def.value)
  }

  function sequencesize (statements, comp) {
    if (statements.length < 2) return
    let seq = [], n = 0, body, stat, i, len
    function push_seq () {
      if (!seq.length) return
      body = make_sequence(seq[0], seq)
      statements[n++] = make_node(ast_statement, body, {body})
      seq = []
    }
    for (i = 0, len = statements.length; i < len; i++) {
      stat = statements[i]
      if (stat instanceof ast_statement) {
        if (seq.length >= comp.sequences_limit) push_seq()
        body = stat.body
        if (seq.length > 0) body = body.drop(comp)
        if (body) merge_sequence(seq, body)
      } else if (stat instanceof ast_definitions && declarations_only(stat)
        || stat instanceof ast_defun) {
        statements[n++] = stat
      } else {
        push_seq()
        statements[n++] = stat
      }
    }
    push_seq()
    statements.length = n
    if (n != len) changed = true
  }

  function to_simple_statement (block, decls) {
    if (!(block instanceof ast_block_statement)) return block
    let i = 0, len = block.body.length, line, stat
    for (; i < len; i++) {
      line = block.body[i]
      if (line instanceof ast_var && declarations_only(line)) {
        decls.push(line)
      } else if (stat || line instanceof ast_const || line instanceof ast_let) {
        return false
      } else {
        stat = line
      }
    }
    return stat
  }

  function sequencesize_2 (statements, comp) {
    function cons_seq(right) {
      n--
      changed = true
      const left = prev.body
      return make_sequence(left, [left, right]).transform(comp)
    }
    let i = 0, j = statements.length, n = 0, stat, prev
    for (; i < j; i++) {
      stat = statements[i]
      if (prev) {
        if (stat instanceof ast_exit) {
          stat.value = cons_seq(stat.value || make_node(ast_undefined, stat).transform(comp))
        } else if (stat instanceof ast_for) {
          if (!(stat.init instanceof ast_definitions)) {
            const abort = observe(prev.body, root => {
              if (root instanceof ast_scope) return true
              if (root instanceof ast_binary && root.operator == 'in') return walk_abort
            })
            if (!abort) {
              if (stat.init) {
                stat.init = cons_seq(stat.init)
              } else {
                stat.init = prev.body
                n--
                changed = true
              }
            }
          }
        } else if (stat instanceof ast_for_in) {
          if (!(stat.init instanceof ast_const) && !(stat.init instanceof ast_let)) stat.object = cons_seq(stat.object)
        } else if (stat instanceof ast_if) {
          stat.condition = cons_seq(stat.condition)
        } else if (stat instanceof ast_switch) {
          stat.expr = cons_seq(stat.expr)
        } else if (stat instanceof ast_with) {
          stat.expr = cons_seq(stat.expr)
        }
      }
      if (comp.options['conditionals'] && stat instanceof ast_if) {
        const decls = []
        const body = to_simple_statement(stat.body, decls)
        const alt = to_simple_statement(stat.alt, decls)
        if (body !== false && alt !== false && decls.length > 0) {
          const len = decls.length
          decls.push(make_node(ast_if, stat, {condition: stat.condition, body: body || make_node(ast_empty_statement, stat.body), alt}))
          decls.unshift(n, 1)
          const empty = []
          empty.splice.apply(statements, decls)
          i += len
          n += len + 1
          prev = null
          changed = true
          continue
        }
      }
      statements[n++] = stat
      prev = stat instanceof ast_statement ? stat : null
    }
    statements.length = n
  }

  function join_object_assignments(defn, body) {
    if (!(defn instanceof ast_definitions)) return
    const defined = defn.defs[defn.defs.length - 1]
    if (!(defined.value instanceof ast_object)) return
    let exprs
    if (body instanceof ast_assign && !body.logical) {
      exprs = [body]
    } else if (body instanceof ast_sequence) {
      exprs = body.expressions.slice()
    }
    if (!exprs) return
    let trimmed = false
    do {
      let root = exprs[0]
      if (!(root instanceof ast_assign)) break
      if (root.operator != '=') break
      if (!(root.left instanceof ast_prop_access)) break
      const sym = root.left.expr
      if (!(sym instanceof ast_symbol_ref)) break
      if (defined.name.name != sym.name) break
      if (!root.right.is_constant_expression(nearest_scope)) break
      let prop = root.left.property
      if (prop instanceof tree) prop = prop.evaluate(comp)
      if (prop instanceof tree) break
      prop = '' + prop
      function diff (root) { return root.key && root.key.name != prop }
      if (!defined.value.properties.every(diff)) break
      const p = defined.value.properties.filter(function (p) { return p.key === prop })[0]
      if (!p) {
        defined.value.properties.push(make_node(ast_key_value, root, {key: prop, value: root.right}))
      } else {
        p.value = new ast_sequence({start: p.start, expressions: [p.value.copy(), root.right.copy()], end: p.end, file: ''})
      }
      exprs.shift()
      trimmed = true
    } while (exprs.length)
    return trimmed && exprs
  }

  function join_consecutive_vars (statements) {
    let i = 0, j = -1, len = statements.length, stat, prev, defs, exprs
    for (; i < len; i++) {
      stat = statements[i]
      prev = statements[j]
      if (stat instanceof ast_definitions) {
        if (prev && prev.type == stat.type) {
          prev.defs = prev.defs.concat(stat.defs)
          changed = true
        } else if (defs && defs.type == stat.type && declarations_only(stat)) {
          defs.defs = defs.defs.concat(stat.defs)
          changed = true
        } else {
          statements[++j] = stat
          defs = stat
        }
      } else if (stat instanceof ast_exit) {
        stat.value = extract_object_assignments(stat.value)
      } else if (stat instanceof ast_for) {
        exprs = join_object_assignments(prev, stat.init)
        if (exprs) {
          changed = true
          stat.init = exprs.length ? make_sequence(stat.init, exprs) : null
          statements[++j] = stat
        } else if (prev instanceof ast_var && (!stat.init || stat.init.type == prev.type)) {
          if (stat.init) prev.defs = prev.defs.concat(stat.init.defs)
          stat.init = prev
          statements[j] = stat
          changed = true
        } else if (defs instanceof ast_var && stat.init instanceof ast_var && declarations_only(stat.init)) {
          defs.defs = defs.defs.concat(stat.init.defs)
          stat.init = null
          statements[++j] = stat
          changed = true
        } else {
          statements[++j] = stat
        }
      } else if (stat instanceof ast_for_in) {
        stat.object = extract_object_assignments(stat.object)
      } else if (stat instanceof ast_if) {
        stat.condition = extract_object_assignments(stat.condition)
      } else if (stat instanceof ast_statement) {
        exprs = join_object_assignments(prev, stat.body)
        if (exprs) {
          changed = true
          if (!exprs.length) continue
          stat.body = make_sequence(stat.body, exprs)
        }
        statements[++j] = stat
      } else if (stat instanceof ast_switch) {
        stat.expr = extract_object_assignments(stat.expr)
      } else if (stat instanceof ast_with) {
        stat.expr = extract_object_assignments(stat.expr)
      } else {
        statements[++j] = stat
      }
    }
    statements.length = j + 1
    function extract_object_assignments (value) {
      statements[++j] = stat
      exprs = join_object_assignments(prev, value)
      if (exprs) {
        changed = true
        if (exprs.length) {
          return make_sequence(value, exprs)
        } else if (value instanceof ast_sequence) {
          return value.tail_node().left
        } else {
          return value.left
        }
      }
      return value
    }
  }
}

function def_reduce_vars (root, func) {
  root.prototype.reduce_vars = func
}

def_reduce_vars(tree, func)

function reset_def (comp, defined) {
  defined.assignments = 0
  defined.chained = false
  defined.direct_access = false
  defined.escaped = 0
  defined.recursive_refs = 0
  defined.references = []
  defined.single_use = undefined
  if (defined.scope.pinned() || (defined.orig[0] instanceof ast_symbol_funarg && defined.scope.uses_args)) {
    defined.fixed = false
  } else if (defined.orig[0] instanceof ast_symbol_const || !comp.exposed(defined)) {
    defined.fixed = defined.init
  } else {
    defined.fixed = false
  }
}

function reset_variables (trees, comp, root) {
  root.variables.forEach(function (defined) {
    reset_def(comp, defined)
    if (defined.fixed === null) {
      trees.defs_to_safe_ids.set(defined.id, trees.safe)
      mark(trees, defined, true)
    } else if (defined.fixed) {
      trees.loop_ids.set(defined.id, trees.in_loop)
      mark(trees, defined, true)
    }
  })
}

function reset_block_variables (comp, root) {
  if (root.blocks) root.blocks.variables.forEach((defined) => reset_def(comp, defined))
}

function push (trees) {
  trees.safe = Object.create(trees.safe)
}

function pop (trees) {
  trees.safe = Object.getPrototypeOf(trees.safe)
}

function mark (trees, defined, safe) {
  trees.safe[defined.id] = safe
}

function safe_to_read (trees, defined) {
  if (defined.single_use == 'm') return false
  if (trees.safe[defined.id]) {
    if (defined.fixed == null) {
      const orig = defined.orig[0]
      if (orig instanceof ast_symbol_funarg || orig.name == 'arguments') return false
      defined.fixed = make_node(ast_undefined, orig)
    }
    return true
  }
  return defined.fixed instanceof ast_defun
}

function safe_to_assign (trees, defined, scope, value) {
  if (defined.fixed === undefined) return true
  let def_safe_ids
  if (defined.fixed === null && (def_safe_ids = trees.defs_to_safe_ids.get(defined.id))) {
    def_safe_ids[defined.id] = false
    trees.defs_to_safe_ids.delete(defined.id)
    return true
  }
  if (!owns(trees.safe, defined.id)) return false
  if (!safe_to_read(trees, defined)) return false
  if (defined.fixed === false) return false
  if (defined.fixed != null && (!value || defined.references.length > defined.assignments)) return false
  if (defined.fixed instanceof ast_defun) return value instanceof tree && defined.fixed.parents === scope
  return defined.orig.every((sym) => {
    return !(sym instanceof ast_symbol_const || sym instanceof ast_symbol_defun || sym instanceof ast_symbol_lambda)
  })
}

function ref_once (trees, comp, defined) {
  return comp.options['unused'] && !defined.scope.pinned()
    && defined.references.length - defined.recursive_refs == 1
    && trees.loop_ids.get(defined.id) === trees.in_loop
}

function is_immutable (value) {
  if (!value) return false
  return value.is_constant() || value instanceof ast_lambda || value instanceof ast_this
}

function mark_escaped (trees, defined, scope, root, value, level = 0, depth = 1) {
  const parent = trees.parent(level)
  if (value) {
    if (value.is_constant()) return
    if (value instanceof ast_class_expression) return
  }
  if (parent instanceof ast_assign && (parent.operator == '=' || parent.logical) && root === parent.right
    || parent instanceof ast_call && (root !== parent.expr || parent instanceof ast_new)
    || parent instanceof ast_exit && root === parent.value && root.scope !== defined.scope
    || parent instanceof ast_var_def && root === parent.value
    || parent instanceof ast_yield && root === parent.value && root.scope !== defined.scope) {
    if (depth > 1 && !(value && value.is_constant_expression(scope))) depth = 1
    if (!defined.escaped || defined.escaped > depth) defined.escaped = depth
    return
  } else if (parent instanceof ast_array || parent instanceof ast_await
    || parent instanceof ast_binary && lazy_op.has(parent.operator)
    || parent instanceof ast_conditional && root !== parent.condition
    || parent instanceof ast_spread || parent instanceof ast_sequence && root === parent.tail_node()) {
    mark_escaped(trees, defined, scope, parent, parent, level + 1, depth)
  } else if (parent instanceof ast_key_value && root === parent.value) {
    const obj = trees.parent(level + 1)
    mark_escaped(trees, defined, scope, obj, obj, level + 2, depth)
  } else if (parent instanceof ast_prop_access && root === parent.expr) {
    value = read_property(value, parent.property)
    mark_escaped(trees, defined, scope, parent, value, level + 1, depth + 1)
    if (value) return
  }
  if (level > 0) return
  if (parent instanceof ast_sequence && root !== parent.tail_node()) return
  if (parent instanceof ast_statement) return
  defined.direct_access = true
}

const suppress = root => observe(root, root => {
  if (!(root instanceof ast_symbol)) return
  const defined = root.defined()
  if (!defined) return
  if (root instanceof ast_symbol_ref) defined.references.push(root)
  defined.fixed = false
})

def_reduce_vars(ast_accessor, function (trees, ascend, comp) {
  push(trees)
  reset_variables(trees, comp, this)
  ascend()
  pop(trees)
  return true
})

def_reduce_vars(ast_assign, function (trees, ascend, comp) {
  const root = this
  if (root.left instanceof ast_destructure) {
    suppress(root.left)
    return
  }
  const finish_walk = () => {
    if (root.logical) {
      root.left.observe(trees)
      push(trees)
      root.right.observe(trees)
      pop(trees)
      return true
    }
  }
  const sym = root.left
  if (!(sym instanceof ast_symbol_ref)) return finish_walk()
  const defined = sym.defined()
  const safe = safe_to_assign(trees, defined, sym.scope, root.right)
  defined.assignments++
  if (!safe) return finish_walk()
  const fixed = defined.fixed
  if (!fixed && root.operator != '=' && !root.logical) return finish_walk()
  const eq = root.operator == '='
  const value = eq ? root.right : root
  if (is_modified(comp, trees, root, value, 0)) return finish_walk()
  defined.references.push(sym)
  if (!root.logical) {
    if (!eq) defined.chained = true
    defined.fixed = eq ? function () { return root.right } : function () {
      return make_node(ast_binary, root, {operator: root.operator.slice(0, -1),
        left: fixed instanceof tree ? fixed : fixed(), right: root.right})
    }
  }
  if (root.logical) {
    mark(trees, defined, false)
    push(trees)
    root.right.observe(trees)
    pop(trees)
    return true
  }
  mark(trees, defined, false)
  root.right.observe(trees)
  mark(trees, defined, true)
  mark_escaped(trees, defined, sym.scope, root, value, 0, 1)
  return true
})

def_reduce_vars(ast_binary, function (trees) {
  if (!lazy_op.has(this.operator)) return
  this.left.observe(trees)
  push(trees)
  this.right.observe(trees)
  pop(trees)
  return true
})

def_reduce_vars(ast_block, function (trees, ascend, comp) {
  reset_block_variables(comp, this)
})

def_reduce_vars(ast_case, function (trees) {
  push(trees)
  this.expr.observe(trees)
  pop(trees)
  push(trees)
  traverse(this, trees)
  pop(trees)
  return true
})

def_reduce_vars(ast_class, function (trees, ascend) {
  clear_flag(this, inlined_flag)
  push(trees)
  ascend()
  pop(trees)
  return true
})

def_reduce_vars(ast_class_static, function (trees, ascend, comp) {
  reset_block_variables(comp, this)
})

def_reduce_vars(ast_conditional, function (trees) {
  this.condition.observe(trees)
  push(trees)
  this.consequent.observe(trees)
  pop(trees)
  push(trees)
  this.alt.observe(trees)
  pop(trees)
  return true
})

def_reduce_vars(ast_chain, function (trees, ascend) {
  const safe = trees.safe
  ascend()
  trees.safe = safe
  return true
})

def_reduce_vars(ast_call, function (trees) {
  this.expr.observe(trees)
  if (this.optional) push(trees)
  for (const arg of this.args) arg.observe(trees)
  return true
})

def_reduce_vars(ast_prop_access, function (trees) {
  if (!this.optional) return
  this.expr.observe(trees)
  push(trees)
  if (this.property instanceof tree) this.property.observe(trees)
  return true
})

def_reduce_vars(ast_default, function (trees, ascend) {
  push(trees)
  ascend()
  pop(trees)
  return true
})

function mark_lambda (trees, ascend, comp) {
  clear_flag(this, inlined_flag)
  push(trees)
  reset_variables(trees, comp, this)
  let iife
  if (!this.name && !this.uses_args && !this.pinned() && (iife = trees.parent()) instanceof ast_call && iife.expr === this
    && !iife.args.some(arg => arg instanceof ast_spread) && this.argnames.every(arg_name => arg_name instanceof ast_symbol)) {
    this.argnames.forEach((arg, i) => {
      if (!arg.defined) return
      const defined = arg.defined()
      if (defined.orig.length > 1) return
      if (defined.fixed === undefined && !this.uses_args) {
        defined.fixed = function () { return iife.args[i] || make_node(ast_undefined, iife) }
        trees.loop_ids.set(defined.id, trees.in_loop)
        mark(trees, defined, true)
      } else {
        defined.fixed = false
      }
    })
  }
  ascend()
  pop(trees)
  handle_defined_after_hoist(this)
  return true
}

function handle_defined_after_hoist (parent) {
  const defuns = []
  observe(parent, root => {
    if (root === parent) return
    if (root instanceof ast_defun) defuns.push(root)
    if (root instanceof ast_scope || root instanceof ast_statement) return true
  })
  const symbols_of_interest = new Set()
  const defuns_of_interest = new Set()
  const potential_conflicts = []
  for (const defun of defuns) {
    const fname_def = defun.name.defined()
    const found_self_ref_in_other_defuns = defuns.some(
      defined => defined !== defun && defined.encl.indexOf(fname_def) !== -1
    )
    for (const defined of defun.encl) {
      if (defined.fixed === false || defined === fname_def || defined.scope.get_defun_scope() !== parent) continue
      if (defined.assignments === 0 && defined.orig.length === 1 && defined.orig[0] instanceof ast_symbol_defun) continue
      if (found_self_ref_in_other_defuns) {
        defined.fixed = false
        continue
      }
      potential_conflicts.push({defun, defined, fname_def})
      symbols_of_interest.add(defined.id)
      symbols_of_interest.add(fname_def.id)
      defuns_of_interest.add(defun)
    }
  }

  if (potential_conflicts.length) {
    const found_symbols = []
    const found_symbol_writes = new Set()
    const defun_ranges = new Map()
    let trees
    parent.observe((trees = new observes((root, ascend) => {
      if (root instanceof ast_defun && defuns_of_interest.has(root)) {
        const start = found_symbols.length
        ascend()
        const end = found_symbols.length
        defun_ranges.set(root, {start, end})
        return true
      }
      if (root instanceof ast_symbol && root.thedef) {
        const id = root.defined().id
        if (symbols_of_interest.has(id)) {
          if (root instanceof ast_declaration || is_lhs(root, trees)) found_symbol_writes.add(found_symbols.length)
          found_symbols.push(id)
        }
      }
    })))

    for (const { defined, defun, fname_def } of potential_conflicts) {
      const defun_range = defun_ranges.get(defun)
      const find = (sym_id, starting_at = 0, must_be_write = false) => {
        let index = starting_at
        while (true) {
          index = found_symbols.indexOf(sym_id, index)
          if (index === -1) {
            break
          } else if (index >= defun_range.start && index < defun_range.end) {
            index = defun_range.end
            continue
          } else if (must_be_write && !found_symbol_writes.has(index)) {
            index++
            continue
          } else {
            break
          }
        }
        return index
      }
      const read_defun_at = find(fname_def.id)
      const wrote_def_at = find(defined.id, read_defun_at + 1, true)
      const wrote_def_after_reading_defun = read_defun_at != -1 && wrote_def_at != -1 && wrote_def_at > read_defun_at
      if (wrote_def_after_reading_defun) defined.fixed = false
    }
  }
}

def_reduce_vars(ast_lambda, mark_lambda)

def_reduce_vars(ast_do, function (trees, ascend, comp) {
  reset_block_variables(comp, this)
  const saved_loop = trees.in_loop
  trees.in_loop = this
  push(trees)
  this.body.observe(trees)
  if (has_break_or_continue(this)) {
    pop(trees)
    push(trees)
  }
  this.condition.observe(trees)
  pop(trees)
  trees.in_loop = saved_loop
  return true
})

def_reduce_vars(ast_for, function (trees, ascend, comp) {
  reset_block_variables(comp, this)
  if (this.init) this.init.observe(trees)
  const saved_loop = trees.in_loop
  trees.in_loop = this
  push(trees)
  if (this.condition) this.condition.observe(trees)
  this.body.observe(trees)
  if (this.step) {
    if (has_break_or_continue(this)) {
      pop(trees)
      push(trees)
    }
    this.step.observe(trees)
  }
  pop(trees)
  trees.in_loop = saved_loop
  return true
})

def_reduce_vars(ast_for_in, function (trees, ascend, comp) {
  reset_block_variables(comp, this)
  suppress(this.init)
  this.object.observe(trees)
  const saved_loop = trees.in_loop
  trees.in_loop = this
  push(trees)
  this.body.observe(trees)
  pop(trees)
  trees.in_loop = saved_loop
  return true
})

def_reduce_vars(ast_if, function (trees) {
  this.condition.observe(trees)
  push(trees)
  this.body.observe(trees)
  pop(trees)
  if (this.alt) {
    push(trees)
    this.alt.observe(trees)
    pop(trees)
  }
  return true
})

def_reduce_vars(ast_labeled_statement, function (trees) {
  push(trees)
  this.body.observe(trees)
  pop(trees)
  return true
})

def_reduce_vars(ast_symbol_catch, function () {
  this.defined().fixed = false
})

def_reduce_vars(ast_symbol_ref, function (trees, ascend, comp) {
  const defined = this.defined()
  defined.references.push(this)
  if (defined.references.length == 1 && !defined.fixed && defined.orig[0] instanceof ast_symbol_defun) {
    trees.loop_ids.set(defined.id, trees.in_loop)
  }
  let fixed_value
  if (defined.fixed === undefined || !safe_to_read(trees, defined)) {
    defined.fixed = false
  } else if (defined.fixed) {
    fixed_value = this.fixed_value()
    if (fixed_value instanceof ast_lambda && is_recursive_ref(trees, defined)) {
      defined.recursive_refs++
    } else if (fixed_value && !comp.exposed(defined) && ref_once(trees, comp, defined)) {
      defined.single_use = fixed_value instanceof ast_lambda && !fixed_value.pinned() || fixed_value instanceof ast_class
        || defined.scope === this.scope && fixed_value.is_constant_expression()
    } else {
      defined.single_use = false
    }
    if (is_modified(comp, trees, this, fixed_value, 0, is_immutable(fixed_value))) {
      defined.single_use ? defined.single_use = 'm' : defined.fixed = false
    }
  }
  mark_escaped(trees, defined, this.scope, this, fixed_value, 0, 1)
})

def_reduce_vars(ast_toplevel, function (trees, ascend, comp) {
  this.globals.forEach(function (defined) {
    reset_def(comp, defined)
  })
  reset_variables(trees, comp, this)
  ascend()
  handle_defined_after_hoist(this)
  return true
})

def_reduce_vars(ast_try, function (trees, ascend, comp) {
  reset_block_variables(comp, this)
  push(trees)
  this.body.observe(trees)
  pop(trees)
  if (this.bcatch) {
    push(trees)
    this.bcatch.observe(trees)
    pop(trees)
  }
  if (this.bfinally) this.bfinally.observe(trees)
  return true
})

def_reduce_vars(ast_unary, function (trees) {
  const root = this
  if (root.operator !== '++' && root.operator !== '--') return
  const expr = root.expr
  if (!(expr instanceof ast_symbol_ref)) return
  const defined = expr.defined()
  const safe = safe_to_assign(trees, defined, expr.scope, true)
  defined.assignments++
  if (!safe) return
  const fixed = defined.fixed
  if (!fixed) return
  defined.references.push(expr)
  defined.chained = true
  defined.fixed = function () {
    return make_node(ast_binary, root, {operator: root.operator.slice(0, -1),
      left: make_node(ast_unary_prefix, root, { operator: '+', expr: fixed instanceof tree ? fixed : fixed()}),
      right: make_node(ast_number, root, {value: 1})
    })
  }
  mark(trees, defined, true)
  return true
})

def_reduce_vars(ast_var_def, function (trees, ascend) {
  const root = this
  if (root.name instanceof ast_destructure) {
    suppress(root.name)
    return
  }
  const defined = root.name.defined()
  if (root.value) {
    if (safe_to_assign(trees, defined, root.name.scope, root.value)) {
      defined.fixed = function () { return root.value}
      trees.loop_ids.set(defined.id, trees.in_loop)
      mark(trees, defined, false)
      ascend()
      mark(trees, defined, true)
      return true
    } else {
      defined.fixed = false
    }
  }
})

def_reduce_vars(ast_while, function (trees, ascend, comp) {
  reset_block_variables(comp, this)
  const saved_loop = trees.in_loop
  trees.in_loop = this
  push(trees)
  ascend()
  pop(trees)
  trees.in_loop = saved_loop
  return true
})

function def_eval(root, func) { root.prototype._eval = func }

const nullish = Symbol('nullish')

tree.prototype.evaluate = function (comp) {
  const val = this._eval(comp, 1)
  if (!val || val instanceof RegExp) return val
  if (typeof val == 'function' || typeof val == 'object' || val == nullish) return this
  if (typeof val == 'string') {
    const unevaluated_size = this.size(comp)
    if (val.length + 2 > unevaluated_size) return this
  }
  return val
}

const unary_prefix = make_set('! ~ - + void')

tree.prototype.is_constant = function () {
  if (this instanceof ast_literal) {
    return !(this instanceof ast_reg_exp)
  } else {
    return this instanceof ast_unary_prefix && this.expr instanceof ast_literal && unary_prefix.has(this.operator)
  }
}

tree.prototype._eval = return_this
ast_class.prototype._eval = return_this
ast_lambda.prototype._eval = return_this
ast_state.prototype._eval = return_false
ast_literal.prototype._eval = function () {
  return this.getValue()
}

const supports_bigint = typeof BigInt == 'function'

ast_big_int.prototype._eval = function () {
  return supports_bigint ? BigInt(this.value) : this
}

ast_reg_exp.prototype._eval = function (comp) {
  let evaluated = comp.evaluated_regexps.get(this.value)
  if (evaluated === undefined && regexp_is_safe(this.value.source)) {
    try {
      const { source, flags } = this.value
      evaluated = new RegExp(source, flags)
    } catch (e) {
      evaluated = null
    }
    comp.evaluated_regexps.set(this.value, evaluated)
  }
  return evaluated || this
}

ast_template_string.prototype._eval = function () {
  if (this.segments.length !== 1) return this
  return this.segments[0].value
}

ast_function.prototype._eval = function (comp) { return this }

def_eval(ast_array, function (comp, depth) { return this })
def_eval(ast_object, function (comp, depth) { return this })

const non_converting_unary = make_set('! typeof void')
def_eval(ast_unary_prefix, function (comp, depth) {
  let expr = this.expr
  if (comp.options['typeofs'] && this.operator == 'typeof' && (expr instanceof ast_lambda
      || expr instanceof ast_symbol_ref && expr.fixed_value() instanceof ast_lambda)) {
    return typeof func
  }
  if (!non_converting_unary.has(this.operator)) depth++
  expr = expr._eval(comp, depth)
  if (expr === this.expr) return this
  switch (this.operator) {
    case '!': return !expr
    case 'typeof':
      if (expr instanceof RegExp) return this
      return typeof expr
    case 'void': return void expr
    case '~': return ~expr
    case '-': return -expr
    case '+': return +expr
  }
  return this
})

const non_converting_binary = make_set('&& || ?? === !==')
const identity_comparison = make_set('== != === !==')
const has_identity = value => typeof value == 'object' || typeof value == 'function' || typeof value == 'symbol'

def_eval(ast_binary, function (comp, depth) {
  if (!non_converting_binary.has(this.operator)) depth++
  const left = this.left._eval(comp, depth)
  if (left === this.left) return this
  const right = this.right._eval(comp, depth)
  if (right === this.right) return this
  if (left != null && right != null && identity_comparison.has(this.operator)
    && has_identity(left) && has_identity(right) && typeof left === typeof right) {
    return this
  }
  if ((typeof left == 'bigint') !== (typeof right == 'bigint') || typeof left == 'bigint' && (this.operator == '>>>'
    || this.operator == '/' && Number(right) === 0)) {
    return this
  }
  let result
  switch (this.operator) {
    case '&&': result = left && right; break
    case '||': result = left || right; break
    case '??': result = left != null ? left : right; break
    case '|': result = left | right; break
    case '&': result = left & right; break
    case '^': result = left ^ right; break
    case '+': result = left + right; break
    case '*': result = left * right; break
    case '**': result = left ** right; break
    case '/': result = left / right; break
    case '%': result = left % right; break
    case '-': result = left - right; break
    case '<<': result = left << right; break
    case '>>': result = left >> right; break
    case '>>>': result = left >>> right; break
    case '==': result = left == right; break
    case '===': result = left === right; break
    case '!=': result = left != right; break
    case '!==': result = left !== right; break
    case '<': result = left < right; break
    case '<=': result = left <= right; break
    case '>': result = left > right; break
    case '>=': result = left >= right; break
    default: return this
  }
  if (typeof result == 'number' && isNaN(result) && comp.find_parent(ast_with)) return this
  return result
})

def_eval(ast_conditional, function (comp, depth) {
  const condition = this.condition._eval(comp, depth)
  if (condition === this.condition) return this
  const root = condition ? this.consequent : this.alt
  const value = root._eval(comp, depth)
  return value === root ? this : value
})

const reentrant_ref_eval = new Set()
def_eval(ast_symbol_ref, function (comp, depth) {
  if (reentrant_ref_eval.has(this)) return this
  const fixed = this.fixed_value()
  if (!fixed) return this
  reentrant_ref_eval.add(this)
  const value = fixed._eval(comp, depth)
  reentrant_ref_eval.delete(this)
  if (value === fixed) return this
  if (value && typeof value == 'object') {
    const escaped = this.defined().escaped
    if (escaped && depth > escaped) return this
  }
  return value
})

def_eval(ast_prop_access, function (comp, depth) {
  let obj = this.expr._eval(comp, depth + 1)
  if (obj === nullish || (this.optional && obj == null)) return nullish
  if (this.property == 'length') {
    if (typeof obj == 'string') return obj.length
    const is_spreadless_array = obj instanceof ast_array && obj.elements.every(el => !(el instanceof ast_spread))
    if (is_spreadless_array && obj.elements.every(el => !el.has_side_effects(comp))) return obj.elements.length
  }
  return this
})

def_eval(ast_chain, function (comp, depth) {
  const evaluated = this.expr._eval(comp, depth)
  return evaluated === nullish ? undefined : evaluated === this.expr ? this : evaluated
})

def_eval(ast_call, function (comp, depth) {
  const expr = this.expr
  const callee = expr._eval(comp, depth)
  if (callee === nullish || (this.optional && callee == null)) return nullish
  return this
})

def_eval(ast_new, return_this)

const safe_globals = new Set([ 'Number', 'String', 'Array', 'Object', 'Function', 'Promise' ])

const is_undeclared_ref = (root) => (root instanceof ast_symbol_ref && root.defined().undeclared)
const bitwise_binop = make_set('<<< >> << & | ^ ~')
const lazy_op = make_set('&& || ??')
const unary_side_effects = make_set('delete ++ --')
const unary_bool = make_set('! delete')
const binary_bool = make_set('in instanceof == != === !== < <= >= >')

function def_is_boolean (root, func) {
  root.prototype.is_boolean = func
}

def_is_boolean(tree, return_false)
def_is_boolean(ast_unary_prefix, function () {
  return unary_bool.has(this.operator)
})
def_is_boolean(ast_binary, function () {
  return binary_bool.has(this.operator) || lazy_op.has(this.operator)
    && this.left.is_boolean() && this.right.is_boolean()
})
def_is_boolean(ast_conditional, function () {
  return this.consequent.is_boolean() && this.alt.is_boolean()
})
def_is_boolean(ast_assign, function () {
  return this.operator == '=' && this.right.is_boolean()
})
def_is_boolean(ast_sequence, function () {
  return this.tail_node().is_boolean()
})
def_is_boolean(ast_true, return_true)
def_is_boolean(ast_false, return_true)

function def_is_number (root, func) {
  root.prototype.is_number = func
}

def_is_number(tree, return_false)
def_is_number(ast_number, return_true)
const unary = make_set('+ - ~ ++ --')
def_is_number(ast_unary, function () {
  return unary.has(this.operator) && !(this.expr instanceof ast_big_int)
})
const numeric_ops = make_set('- * / % & | ^ << >> >>>')
def_is_number(ast_binary, function (comp) {
  return numeric_ops.has(this.operator) || this.operator == '+'
    && this.left.is_number(comp)
    && this.right.is_number(comp)
})
def_is_number(ast_assign, function (comp) {
  return numeric_ops.has(this.operator.slice(0, -1))
    || this.operator == '=' && this.right.is_number(comp)
})
def_is_number(ast_sequence, function (comp) {
  return this.tail_node().is_number(comp)
})
def_is_number(ast_conditional, function (comp) {
  return this.consequent.is_number(comp) && this.alt.is_number(comp)
});

function def_is_32_bit_integer (root, func) {
  root.prototype.is_32_bit_integer = func
}

def_is_32_bit_integer(tree, return_false)
def_is_32_bit_integer(ast_number, function () {
  return this.value === (this.value | 0)
})
def_is_32_bit_integer(ast_unary_prefix, function () {
  return this.operator == '~' ? this.expr.is_number() : this.operator == '+' ? this.expr.is_32_bit_integer() : false
})
def_is_32_bit_integer(ast_binary, function () {
  return bitwise_binop.has(this.operator)
})

function def_is_string (root, func) {
  root.prototype.is_string = func
}

def_is_string(tree, return_false)
def_is_string(ast_string, return_true)
def_is_string(ast_template_string, return_true)
def_is_string(ast_unary_prefix, function () {
  return this.operator == 'typeof'
})
def_is_string(ast_binary, function (comp) {
  return this.operator == '+' && (this.left.is_string(comp) || this.right.is_string(comp))
})
def_is_string(ast_assign, function (comp) {
  return (this.operator == '=' || this.operator == '+=') && this.right.is_string(comp)
})
def_is_string(ast_sequence, function (comp) {
  return this.tail_node().is_string(comp)
})
def_is_string(ast_conditional, function (comp) {
  return this.consequent.is_string(comp) && this.alt.is_string(comp)
})

function is_undefined (root, comp) {
  return (has_flag(root, undefined_flag) || root instanceof ast_undefined || root instanceof ast_unary_prefix
    && root.operator == 'void' && !root.expr.has_side_effects(comp))
}

function is_null_or_undefined (root, comp) {
  let fixed
  return (root instanceof ast_null || is_undefined(root, comp) || (root instanceof ast_symbol_ref
    && (fixed = root.defined().fixed) instanceof tree && is_nullish(fixed, comp)))
}

function is_nullish_shortcircuited (root, comp) {
  if (root instanceof ast_prop_access || root instanceof ast_call) {
    return ((root.optional && is_null_or_undefined(root.expr, comp)) || is_nullish_shortcircuited(root.expr, comp))
  }
  if (root instanceof ast_chain) return is_nullish_shortcircuited(root.expr, comp)
  return false
}

function is_nullish (root, comp) {
  if (is_null_or_undefined(root, comp)) return true
  return is_nullish_shortcircuited(root, comp)
}

function def_has_side_effects (root, func) {
  root.prototype.has_side_effects = func
}

def_has_side_effects(tree, return_true)
def_has_side_effects(ast_empty_statement, return_false)
def_has_side_effects(ast_literal, return_false)
def_has_side_effects(ast_this, return_false)

function any(list, comp) {
  for (let i = list.length; --i >= 0;) {
    if (list[i].has_side_effects(comp)) return true
  }
  return false
}

def_has_side_effects(ast_block, function (comp) {
  return any(this.body, comp)
})
def_has_side_effects(ast_call, function (comp) {
  if (!this.is_callee_pure(comp) && (!this.expr.is_call_pure(comp) || this.expr.has_side_effects(comp))) return true
  return any(this.args, comp)
})
def_has_side_effects(ast_switch, function (comp) {
  return this.expr.has_side_effects(comp) || any(this.body, comp)
})
def_has_side_effects(ast_case, function (comp) {
  return this.expr.has_side_effects(comp) || any(this.body, comp)
})
def_has_side_effects(ast_try, function (comp) {
  return this.body.has_side_effects(comp)
    || this.bcatch && this.bcatch.has_side_effects(comp)
    || this.bfinally && this.bfinally.has_side_effects(comp)
})
def_has_side_effects(ast_if, function (comp) {
  return this.condition.has_side_effects(comp)
    || this.body && this.body.has_side_effects(comp)
    || this.alt && this.alt.has_side_effects(comp)
})
def_has_side_effects(ast_labeled_statement, function (comp) {
  return this.body.has_side_effects(comp)
})
def_has_side_effects(ast_statement, function (comp) {
  return this.body.has_side_effects(comp)
})
def_has_side_effects(ast_lambda, return_false)
def_has_side_effects(ast_class, function (comp) {
  if (this.extends && this.extends.has_side_effects(comp)) return true
  return any(this.properties, comp)
})
def_has_side_effects(ast_class_static, function (comp) {
  return any(this.body, comp)
})
def_has_side_effects(ast_binary, function (comp) {
  return this.left.has_side_effects(comp)
    || this.right.has_side_effects(comp)
})
def_has_side_effects(ast_assign, return_true)
def_has_side_effects(ast_conditional, function (comp) {
  return this.condition.has_side_effects(comp)
    || this.consequent.has_side_effects(comp)
    || this.alt.has_side_effects(comp)
})
def_has_side_effects(ast_unary, function (comp) {
  return unary_side_effects.has(this.operator)
    || this.expr.has_side_effects(comp)
})
def_has_side_effects(ast_symbol_ref, function (comp) {
  return !this.is_declared(comp) && !safe_globals.has(this.name)
})
def_has_side_effects(ast_symbol_class_property, return_false)
def_has_side_effects(ast_declaration, return_false)
def_has_side_effects(ast_object, function (comp) {
  return any(this.properties, comp)
})
def_has_side_effects(ast_object_property, function (comp) {
  return (this.computed_key() && this.key.has_side_effects(comp)
    || this.value && this.value.has_side_effects(comp)
  )
})
def_has_side_effects(ast_class_property, function (comp) {
  return (this.computed_key() && this.key.has_side_effects(comp)
    || this.static && this.value && this.value.has_side_effects(comp)
  )
})
def_has_side_effects(ast_concise_method, function (comp) {
  return this.computed_key() && this.key.has_side_effects(comp)
})
def_has_side_effects(ast_object_getter, function (comp) {
  return this.computed_key() && this.key.has_side_effects(comp)
})
def_has_side_effects(ast_object_setter, function (comp) {
  return this.computed_key() && this.key.has_side_effects(comp)
})
def_has_side_effects(ast_array, function (comp) {
  return any(this.elements, comp)
})
def_has_side_effects(ast_dot, function (comp) {
  if (is_nullish(this, comp)) return this.expr.has_side_effects(comp)
  if (!this.optional && this.expr.may_throw_on_access(comp)) return true
  return this.expr.has_side_effects(comp)
})
def_has_side_effects(ast_sub, function (comp) {
  if (is_nullish(this, comp)) return this.expr.has_side_effects(comp)
  if (!this.optional && this.expr.may_throw_on_access(comp)) return true
  const property = this.property.has_side_effects(comp)
  if (property && this.optional) return true
  return property || this.expr.has_side_effects(comp)
})
def_has_side_effects(ast_chain, function (comp) { return this.expr.has_side_effects(comp) })
def_has_side_effects(ast_sequence, function (comp) { return any(this.expressions, comp) })
def_has_side_effects(ast_definitions, function (comp) { return any(this.defs, comp) })
def_has_side_effects(ast_var_def, function () { return this.value })
def_has_side_effects(ast_template_segment, return_false)
def_has_side_effects(ast_template_string, function (comp) { return any(this.segments, comp) })

function any_throw(list, comp) {
  for (let i = list.length; --i >= 0;) {
    if (list[i].may_throw(comp)) return true
  }
  return false
}

function def_may_throw (root, func) {
  root.prototype.may_throw = func
}

def_may_throw(tree, return_true)
def_may_throw(ast_literal, return_false)
def_may_throw(ast_empty_statement, return_false)
def_may_throw(ast_lambda, return_false)
def_may_throw(ast_declaration, return_false)
def_may_throw(ast_this, return_false)
def_may_throw(ast_class, function (comp) {
  if (this.extends && this.extends.may_throw(comp)) return true
  return any_throw(this.properties, comp)
})
def_may_throw(ast_class_static, function (comp) { return any_throw(this.body, comp) })
def_may_throw(ast_array, function (comp) { return any_throw(this.elements, comp) })
def_may_throw(ast_assign, function (comp) {
  if (this.right.may_throw(comp)) return true
  if (this.operator == '=' && this.left instanceof ast_symbol_ref) return false
  return this.left.may_throw(comp)
})
def_may_throw(ast_binary, function (comp) { return this.left.may_throw(comp) || this.right.may_throw(comp) })
def_may_throw(ast_block, function (comp) { return any_throw(this.body, comp) })
def_may_throw(ast_call, function (comp) {
  if (is_nullish(this, comp)) return false
  if (any_throw(this.args, comp)) return true
  if (this.is_callee_pure(comp)) return false
  if (this.expr.may_throw(comp)) return true
  return !(this.expr instanceof ast_lambda) || any_throw(this.expr.body, comp)
})
def_may_throw(ast_case, function (comp) { return this.expr.may_throw(comp) || any_throw(this.body, comp) })
def_may_throw(ast_conditional, function (comp) {
  return this.condition.may_throw(comp)
    || this.consequent.may_throw(comp)
    || this.alt.may_throw(comp)
})
def_may_throw(ast_definitions, function (comp) { return any_throw(this.defs, comp) })
def_may_throw(ast_if, function (comp) {
  return this.condition.may_throw(comp)
    || this.body && this.body.may_throw(comp)
    || this.alt && this.alt.may_throw(comp)
})
def_may_throw(ast_labeled_statement, function (comp) { return this.body.may_throw(comp) })
def_may_throw(ast_object, function (comp) { return any_throw(this.properties, comp) })
def_may_throw(ast_object_property, function (comp) { return this.value ? this.value.may_throw(comp) : false })
def_may_throw(ast_class_property, function (comp) {
  return (this.computed_key() && this.key.may_throw(comp) || this.static && this.value && this.value.may_throw(comp))
})
def_may_throw(ast_concise_method, function (comp) { return this.computed_key() && this.key.may_throw(comp) })
def_may_throw(ast_object_getter, function (comp) { return this.computed_key() && this.key.may_throw(comp) })
def_may_throw(ast_object_setter, function (comp) { return this.computed_key() && this.key.may_throw(comp) })
def_may_throw(ast_return, function (comp) { return this.value && this.value.may_throw(comp) })
def_may_throw(ast_sequence, function (comp) { return any_throw(this.expressions, comp) })
def_may_throw(ast_statement, function (comp) { return this.body.may_throw(comp) })
def_may_throw(ast_dot, function (comp) {
  if (is_nullish(this, comp)) return false
  return !this.optional && this.expr.may_throw_on_access(comp) || this.expr.may_throw(comp)
})
def_may_throw(ast_sub, function (comp) {
  if (is_nullish(this, comp)) return false
  return !this.optional && this.expr.may_throw_on_access(comp) || this.expr.may_throw(comp) || this.property.may_throw(comp)
})
def_may_throw(ast_chain, function (comp) { return this.expr.may_throw(comp) })
def_may_throw(ast_switch, function (comp) { return this.expr.may_throw(comp) || any_throw(this.body, comp) })
def_may_throw(ast_symbol_ref, function (comp) { return !this.is_declared(comp) && !safe_globals.has(this.name) })
def_may_throw(ast_symbol_class_property, return_false)
def_may_throw(ast_try, function (comp) {
  return this.bcatch ? this.bcatch.may_throw(comp) : this.body.may_throw(comp) || this.bfinally && this.bfinally.may_throw(comp)
})
def_may_throw(ast_unary, function (comp) {
  if (this.operator == 'typeof' && this.expr instanceof ast_symbol_ref) return false
  return this.expr.may_throw(comp)
})
def_may_throw(ast_var_def, function (comp) {
  if (!this.value) return false
  return this.value.may_throw(comp)
})

function def_is_constant (root, func) {
  root.prototype.is_constant_expression = func
}

function all_refs_local (scope) {
  let result = true
  observe(this, root => {
    if (root instanceof ast_symbol_ref) {
      if (has_flag(this, inlined_flag)) {
        result = false
        return walk_abort
      }
      const defined = root.defined()
      const node_name = defined.file + '/' + defined.name
      if (member(defined, this.encl) && !this.variables.has(node_name)) {
        if (scope) {
          const node_name = root.file + '/' + root.name
          const scope_def = scope.find_variable(node_name, {})
          if (defined.undeclared ? !scope_def : scope_def === defined) {
            result = true 
            return true
          }
        }
        result = false
        return walk_abort
      }
      return true
    }
    if (root instanceof ast_this && this instanceof ast_arrow) {
      result = false
      return walk_abort
    }
  })
  return result
}

def_is_constant(tree, return_false)
def_is_constant(ast_literal, return_true)
def_is_constant(ast_class, function (scope) {
  if (this.extends && !this.extends.is_constant_expression(scope)) return false
  for (const prop of this.properties) {
    if (prop.computed_key() && !prop.key.is_constant_expression(scope)) return false
    if (prop.static && prop.value && !prop.value.is_constant_expression(scope)) return false
    if (prop instanceof ast_class_static) return false
  }
  return all_refs_local.call(this, scope)
})
def_is_constant(ast_lambda, all_refs_local)
def_is_constant(ast_unary, function () { return this.expr.is_constant_expression() })
def_is_constant(ast_binary, function () { return this.left.is_constant_expression() && this.right.is_constant_expression() })
def_is_constant(ast_array, function () { return this.elements.every((l) => l.is_constant_expression()) })
def_is_constant(ast_object, function () {  return this.properties.every((l) => l.is_constant_expression()) })
def_is_constant(ast_object_property, function () {
 return !!(!(this.key instanceof tree) && this.value && this.value.is_constant_expression())
})

function def_may_throw_on_access (root, func) { root.prototype._dot_throw = func }

tree.prototype.may_throw_on_access = function (comp) {
  return !comp.options['pure_getters'] || this._dot_throw(comp)
}

function is_strict (comp) { return /strict/.test(comp.options['pure_getters']) }

def_may_throw_on_access(tree, is_strict)
def_may_throw_on_access(ast_null, return_true)
def_may_throw_on_access(ast_undefined, return_true)
def_may_throw_on_access(ast_literal, return_false)
def_may_throw_on_access(ast_array, return_false)
def_may_throw_on_access(ast_object, function (comp) {
  if (!is_strict(comp)) return false
  for (let i = this.properties.length; --i >=0;) {
    if (this.properties[i]._dot_throw(comp)) return true
  }
  return false
})
def_may_throw_on_access(ast_class, return_false)
def_may_throw_on_access(ast_object_property, return_false)
def_may_throw_on_access(ast_object_getter, return_true)
def_may_throw_on_access(ast_spread, function (comp) { return this.expr._dot_throw(comp) })
def_may_throw_on_access(ast_function, return_false)
def_may_throw_on_access(ast_arrow, return_false)
def_may_throw_on_access(ast_unary_postfix, return_false)
def_may_throw_on_access(ast_unary_prefix, function () { return this.operator == 'void' })
def_may_throw_on_access(ast_binary, function (comp) {
  return (this.operator == '&&' || this.operator == '||' || this.operator == '??')
    && (this.left._dot_throw(comp) || this.right._dot_throw(comp))
})
def_may_throw_on_access(ast_assign, function (comp) {
  if (this.logical) return true
  return this.operator == '=' && this.right._dot_throw(comp)
})
def_may_throw_on_access(ast_conditional, function (comp) {
  return this.consequent._dot_throw(comp) || this.alt._dot_throw(comp)
})
def_may_throw_on_access(ast_dot, function (comp) {
  if (!is_strict(comp)) return false
  if (this.property == 'prototype') return !(this.expr instanceof ast_function || this.expr instanceof ast_class)
  return true
})
def_may_throw_on_access(ast_chain, function (comp) { return this.expr._dot_throw(comp) })
def_may_throw_on_access(ast_sequence, function (comp) { return this.tail_node()._dot_throw(comp) })
def_may_throw_on_access(ast_symbol_ref, function (comp) {
  if (this.name == 'arguments' && this.scope instanceof ast_lambda) return false
  if (has_flag(this, undefined_flag)) return true
  if (!is_strict(comp)) return false
  if (is_undeclared_ref(this) && this.is_declared(comp)) return false
  if (this.is_immutable()) return false
  const fixed = this.fixed_value()
  return !fixed || fixed._dot_throw(comp)
})

function is_lhs (root, parent) {
  if (parent instanceof ast_unary && unary_side_effects.has(parent.operator)) return parent.expr
  if (parent instanceof ast_assign && parent.left === root) return root
  if (parent instanceof ast_for_in && parent.init === root) return root
}

function def_negate (root, func) {
  root.prototype.negate = function (comp, first_in_statement) {
    return func.call(this, comp, first_in_statement)
  }
}

function basic_negation (expr) { return make_node(ast_unary_prefix, expr, {operator: '!', expr}) }

function best (orig, alt, first_in_statement) {
  const negated = basic_negation(orig)
  if (first_in_statement) {
    const stat = make_node(ast_statement, alt, {body: alt})
    return best_of_expression(negated, stat) === stat ? alt : negated
  }
  return best_of_expression(negated, alt)
}

def_negate(tree, function () { return basic_negation(this) })
def_negate(ast_statement, function () { throw new Error('cannot negate statement') })
def_negate(ast_function, function () { return basic_negation(this) })
def_negate(ast_class, function () { return basic_negation(this) })
def_negate(ast_arrow, function () { return basic_negation(this) })
def_negate(ast_unary_prefix, function () {
  if (this.operator == '!') return this.expr
  return basic_negation(this)
})
def_negate(ast_sequence, function (comp) {
  const expressions = this.expressions.slice()
  expressions.push(expressions.pop().negate(comp))
  return make_sequence(this, expressions)
})
def_negate(ast_conditional, function (comp, first_in_statement) {
  const self = this.copy()
  self.consequent = self.consequent.negate(comp)
  self.alt = self.alt.negate(comp)
  return best(this, self, first_in_statement)
})
def_negate(ast_binary, function (comp, first_in_statement) {
  const self = this.copy(), op = this.operator
  switch (op) {
    case '==' : self.operator = '!='; return self
    case '!=' : self.operator = '=='; return self
    case '===': self.operator = '!=='; return self
    case '!==': self.operator = '==='; return self
    case '&&':
      self.operator = '||'
      self.left = self.left.negate(comp, first_in_statement)
      self.right = self.right.negate(comp)
      return best(this, self, first_in_statement)
    case '||':
      self.operator = '&&'
      self.left = self.left.negate(comp, first_in_statement)
      self.right = self.right.negate(comp)
      return best(this, self, first_in_statement)
  }
  return basic_negation(this)
})

function def_bitwise_negate (root, func) { root.prototype.bitwise_negate = func }

function bitwise_negation (expr) { return make_node(ast_unary_prefix, expr, {operator: '~', expr}) }

def_bitwise_negate(tree, function () { return bitwise_negation(this) })
def_bitwise_negate(ast_number, function () {
  const neg = ~this.value
  if (neg.toString().length > this.value.toString().length) return bitwise_negation(this)
  return make_node(ast_number, this, {value: neg})
})
def_bitwise_negate(ast_unary_prefix, function (in_32_bit_context) {
  return (this.operator == '~' && (in_32_bit_context || this.expr.is_32_bit_integer())) ? this.expr : bitwise_negation(this)
})

tree.prototype.is_call_pure = return_false
ast_dot.prototype.is_call_pure = return_null

ast_call.prototype.is_callee_pure = function (comp) {
  if (comp.options['side_effects'] && has_annotation(this, _pure)) return true
  return !comp.pure_funcs(this)
}

function aborts (thing) {
  try { return thing && thing.aborts() } catch (e) { return false }
}

function def_aborts (root, func) {
  root.prototype.aborts = func
}

def_aborts(ast_statement, return_null)
def_aborts(ast_jump, return_this)
def_aborts(ast_import, return_null)

function block_aborts () {
  for (let i = 0; i < this.body.length; i++) {
    if (aborts(this.body[i])) return this.body[i]
  }
  return null
}

def_aborts(ast_block_statement, block_aborts)
def_aborts(ast_switch_branch, block_aborts)
def_aborts(ast_def_class, function () {
  for (const prop of this.properties) {
    if (prop instanceof ast_class_static && prop.aborts()) return prop
  }
  return null
})
def_aborts(ast_class_static, block_aborts)
def_aborts(ast_if, function () {
  return this.alt && aborts(this.body) && aborts(this.alt) && this
})

tree.prototype.this = function () {
  return observe(this, root => {
    if (root instanceof ast_this) return walk_abort
    if (root !== this && root instanceof ast_scope && !(root instanceof ast_arrow)) return true
  })
}

function is_modified (comp, trees, root, value, level, immutable) {
  const parent = trees.parent(level)
  const lhs = is_lhs(root, parent)
  if (lhs) return lhs
  if (!immutable && parent instanceof ast_call && parent.expr === root
    && !(value instanceof ast_arrow) && !(value instanceof ast_class) && !parent.is_callee_pure(comp)
    && (!(value instanceof ast_function) || !(parent instanceof ast_new) && value.this())) {
    return true
  }
  if (parent instanceof ast_array) return is_modified(comp, trees, parent, parent, level + 1)
  if (parent instanceof ast_key_value && root === parent.value) {
    const obj = trees.parent(level + 1)
    return is_modified(comp, trees, obj, obj, level + 2)
  }
  if (parent instanceof ast_prop_access && parent.expr === root) {
    const prop = read_property(value, parent.property)
    return !immutable && is_modified(comp, trees, parent, prop, level + 1)
  }
}

function def_find_defs (root, func) { root.prototype._find_defs = func }
function to_node (value, orig) {
  if (value instanceof tree) {
    if (!(value instanceof ast_literal)) value = value.copy(true)
    return make_node(value.constructor, orig, value)
  }
  if (Array.isArray(value)) return make_node(ast_array, orig, {
    elements: value.map(function (value) { return to_node(value, orig) })
  })
  if (value && typeof value == 'object') {
    const props = []
    for (let key in value) {
      props.push(make_node(ast_key_value, orig, {key: key, value: to_node(value[key], orig)}))
    }
    return make_node(ast_object, orig, {properties: props})
  }
  return make_node_from_constant(value, orig)
}

def_find_defs(tree, func)
def_find_defs(ast_chain, function (comp, suffix) {
  return this.expr._find_defs(comp, suffix)
})
def_find_defs(ast_dot, function (comp, suffix) {
  return this.expr._find_defs(comp, '.' + this.property + suffix)
})
def_find_defs(ast_declaration, function () {
  if (!this.global()) return
})
def_find_defs(ast_symbol_ref, function (comp, suffix) {
  if (!this.global()) return
  const defines = comp.options['global_defs']
  const name = this.name + suffix
  if (owns(defines, name)) return to_node(defines[name], this)
})

ast_toplevel.prototype.resolve_defines = function (comp) {
  if (!comp.options['global_defs']) return this
  this.figure_out_scope({imports: comp.imports})
  return this.transform(new transforms(function (root) {
    const defined = root._find_defs(comp, '')
    if (!defined) return
    let level = 0, child = root, parent
    while (parent = this.parent(level++)) {
      if (!(parent instanceof ast_prop_access)) break
      if (parent.expr !== child) break
      child = parent
    }
    if (is_lhs(child, parent)) return
    return defined
  }))
}

function compare (node1, node2) {
  return (node1 === null && node2 === null) || (node1.type === node2.type && node1.equals(node2))
}

function equivalent_to (tree1, tree2) {
  if (!compare(tree1, tree2)) return false
  const walk1_state = [tree1]
  const walk2_state = [tree2]
  const walk1_push = walk1_state.push.bind(walk1_state)
  const walk2_push = walk2_state.push.bind(walk2_state)
  while (walk1_state.length && walk2_state.length) {
    const node1 = walk1_state.pop()
    const node2 = walk2_state.pop()
    if (!compare(node1, node2)) return false
    node1.branch(walk1_push)
    node2.branch(walk2_push)
    if (walk1_state.length !== walk2_state.length) return false
  }
  return walk1_state.length == 0 && walk2_state.length == 0
}

function within_array_or_object_literal (comp) {
  let root, level = 0
  while (root = comp.parent(level++)) {
    if (root instanceof ast_state) return false
    if (root instanceof ast_array || root instanceof ast_key_value || root instanceof ast_object) return true
  }
  return false
}

function scope_encloses_variables_in_this_scope (scope, pulled_scope, imports) {
  for (const encl of pulled_scope.encl) {
    const node_name = encl.file + '/' + encl.name
    if (pulled_scope.variables.has(node_name)) continue
    const looked_up = scope.find_variable(node_name, imports)
    if (looked_up) {
      if (looked_up === encl) continue
      return true
    }
  }
  return false
}

function is_const_symbol_short_than_init_value (defined, fixed_value) {
  if (defined.orig.length === 1 && fixed_value) {
    const init_value_length = fixed_value.size()
    const identifer_length = defined.name.length
    return init_value_length > identifer_length
  }
  return true
}

function inline_into_symbolref (self, comp) {
  if (comp.in_computed_key()) return self
  const parent = comp.parent()
  const defined = self.defined()
  const nearest_scope = comp.find_scope()
  let fixed = self.fixed_value()
  if (comp.top_retain && defined.global &&  comp.top_retain(defined) &&
    is_const_symbol_short_than_init_value(defined, fixed)) {
    defined.fixed = false
    defined.single_use = false
    return self
  }
  let single_use = defined.single_use && !(parent instanceof ast_call
    && (parent.is_callee_pure(comp)) || has_annotation(parent, _noinline))
    && !(parent instanceof ast_export && fixed instanceof ast_lambda && fixed.name)
  if (single_use && fixed instanceof tree) single_use = !fixed.has_side_effects(comp) && !fixed.may_throw(comp)
  if (fixed instanceof ast_class && defined.scope !== self.scope) return self
  if (single_use && (fixed instanceof ast_lambda || fixed instanceof ast_class)) {
    if (retain_top_func(fixed, comp)) {
      single_use = false
    } else if (defined.scope !== self.scope && (defined.escaped == 1 || has_flag(fixed, inlined_flag)
      || within_array_or_object_literal(comp) || !comp.options['reduce_funcs'])) {
      single_use = false
    } else if (is_recursive_ref(comp, defined)) {
      single_use = false
    } else if (defined.scope !== self.scope || defined.orig[0] instanceof ast_symbol_funarg) {
      single_use = fixed.is_constant_expression(self.scope)
    }
  }
  if (single_use && (fixed instanceof ast_lambda || fixed instanceof ast_class)) {
    const scope_encloses = scope_encloses_variables_in_this_scope(nearest_scope, fixed, comp.imports)
    single_use = defined.scope === self.scope && !scope_encloses || parent instanceof ast_call
      && parent.expr === self && !scope_encloses && !(fixed.name && fixed.name.defined().recursive_refs > 0)
  }
  if (single_use && fixed) {
    if (fixed instanceof ast_def_class) {
      set_flag(fixed, squeezed_flag)
      fixed = make_node(ast_class_expression, fixed, fixed)
    }
    if (fixed instanceof ast_defun) {
      set_flag(fixed, squeezed_flag)
      fixed = make_node(ast_function, fixed, fixed)
    }
    if (defined.recursive_refs > 0 && fixed.name instanceof ast_symbol_defun) {
      const defun_def = fixed.name.defined()
      const node_name = fixed.name.file + '/' + fixed.name.name
      let lambda_def = fixed.variables.get(node_name)
      let name = lambda_def && lambda_def.orig[0]
      if (!(name instanceof ast_symbol_lambda)) {
        name = make_node(ast_symbol_lambda, fixed.name, fixed.name)
        name.scope = fixed
        fixed.name = name
        lambda_def = fixed.def_function(name)
      }
      observe(fixed, root => {
        if (root instanceof ast_symbol_ref && root.defined() === defun_def) {
          root.thedef = lambda_def
          lambda_def.references.push(root)
        }
      })
    }
    if ((fixed instanceof ast_lambda || fixed instanceof ast_class) && fixed.parents !== nearest_scope) {
      fixed = fixed.copy(true, comp.get_toplevel())
      nearest_scope.add_child_scope(fixed)
    }
    return fixed.optimize(comp)
  }
  if (fixed) {
    let replace
    if (fixed instanceof ast_this) {
      if (!(defined.orig[0] instanceof ast_symbol_funarg) && defined.references.every((ref) => defined.scope === ref.scope)) {
        replace = fixed
      }
    } else {
      let ev = fixed.evaluate(comp)
      if (ev !== fixed) replace = make_node_from_constant(ev, fixed)
    }
    if (replace) {
      const name_length = self.size(comp)
      const replace_size = replace.size(comp)
      let overhead = 0
      if (comp.options['unused'] && !comp.exposed(defined)) {
        overhead = (name_length + 2 + fixed.size(comp)) / (defined.references.length - defined.assignments)
      }
      if (replace_size <= name_length + overhead) return replace
    }
  }
  return self
}

function inline_into_call (self, comp) {
  if (comp.in_computed_key()) return self
  const expr = self.expr, simple_args = self.args.every((arg) => !(arg instanceof ast_spread))
  let fn = expr
  if (comp.options['reduce_vars'] && fn instanceof ast_symbol_ref && !has_annotation(self, _noinline)) {
    const fixed = fn.fixed_value()
    if (retain_top_func(fixed, comp) || !comp.toplevel.funcs && expr.defined().global) return self
    fn = fixed
  }
  const is_func = fn instanceof ast_lambda
  const stat = is_func && fn.body[0], is_regular_func = is_func && !fn.gen && !fn.sync
  const can_inline = is_regular_func && comp.options['inline'] && !self.is_callee_pure(comp)
  if (can_inline && stat instanceof ast_return) {
    let returned = stat.value
    if (!returned || returned.is_constant_expression()) {
      returned = returned ? returned.copy(true) : make_node(ast_undefined, self)
      return make_sequence(self, self.args.concat(returned)).optimize(comp)
    }
    if (fn.argnames.length === 1 && (fn.argnames[0] instanceof ast_symbol_funarg)
      && self.args.length < 2 && !(self.args[0] instanceof ast_spread)
      && returned instanceof ast_symbol_ref && returned.name === fn.argnames[0].name) {
      const replacement = (self.args[0] || make_node(ast_undefined)).optimize(comp)
      let parent
      if (replacement instanceof ast_prop_access && (parent = comp.parent()) instanceof ast_call && parent.expr === self) {
        return make_sequence(self, [make_node(ast_number, self, {value: 0}), replacement])
      }
      return replacement
    }
  }
  let level, scope, in_loop
  if (can_inline) {
    level = -1
    let defined, returned_value, nearest_scope
    if (simple_args && !fn.uses_args && !(comp.parent() instanceof ast_class) && !(fn.name && fn instanceof ast_function)
      && (returned_value = can_flatten_body(stat)) && (expr === fn || has_annotation(self, _inline) || comp.options['unused']
        && (defined = expr.defined()).references.length == 1 && !is_recursive_ref(comp, defined) && fn.is_constant_expression(expr.scope))
      && !has_annotation(self, _pure | _noinline) && !fn.this() && can_inject_symbols() && (nearest_scope = comp.find_scope())
      && !scope_encloses_variables_in_this_scope(nearest_scope, fn, comp.imports)
      && !(function in_default_assign () {
          let p, i = 0
          while ((p = comp.parent(i++))) {
            if (p instanceof ast_default_assign) return true
            if (p instanceof ast_block) break
          }
          return false
        })()
      && !(scope instanceof ast_class)) {
      set_flag(fn, squeezed_flag)
      nearest_scope.add_child_scope(fn)
      return make_sequence(self, flatten_fn(returned_value)).optimize(comp)
    }
  }

  if (can_inline && has_annotation(self, _inline)) {
    set_flag(fn, squeezed_flag)
    fn = make_node(fn.constructor === ast_defun ? ast_function : fn.constructor, fn, fn)
    fn = fn.copy(true)
    fn.figure_out_scope({imports: comp.imports}, {parents: comp.find_scope(), toplevel: comp.get_toplevel()})
    return make_node(ast_call, self, {expr: fn, args: self.args}).optimize(comp)
  }
  const can_drop_this_call = is_regular_func && comp.options['side_effects'] && fn.body.every(is_empty)
  if (can_drop_this_call) {
    const args = self.args.concat(make_node(ast_undefined, self))
    return make_sequence(self, args).optimize(comp)
  }
  if (comp.options['negate_iife'] && comp.parent() instanceof ast_statement && is_iife_call(self)) return self.negate(comp, true)
  let ev = self.evaluate(comp)
  if (ev !== self) {
    ev = make_node_from_constant(ev, self).optimize(comp)
    return best_of(comp, ev, self)
  }
  return self

  function return_value (stat) {
    if (!stat) return make_node(ast_undefined, self)
    if (stat instanceof ast_return) {
      if (!stat.value) return make_node(ast_undefined, self)
      return stat.value.copy(true)
    }
    if (stat instanceof ast_statement) {
      return make_node(ast_unary_prefix, stat, {operator: 'void', expr: stat.body.copy(true)})
    }
  }

  function can_flatten_body (stat) {
    const body = fn.body
    const len = body.length
    if (comp.options['inline'] < 3) return len == 1 && return_value(stat)
    let line
    for (let i = 0; i < len; i++) {
      line = body[i]
      if (line instanceof ast_var) {
        if (stat && !line.defs.every((var_def) => !var_def.value)) return false
      } else if (stat) {
        return false
      } else if (!(line instanceof ast_empty_statement)) {
        stat = line
      }
    }
    return return_value(stat)
  }

  function can_inject_args (block, safe) {
    let arg
    for (let i = 0, len = fn.argnames.length; i < len; i++) {
      arg = fn.argnames[i]
      if (arg instanceof ast_default_assign) {
        if (has_flag(arg.left, unused_flag)) continue
        return false
      }
      if (arg instanceof ast_destructure) return false
      if (arg instanceof ast_spread) {
        if (has_flag(arg.expr, unused_flag)) continue
        return false
      }
      if (has_flag(arg, unused_flag)) continue
      if (!safe || block.has(arg.name) || identifier_atom.has(arg.name) || scope.conflicting_def(arg.name, arg.file)) return false
      if (in_loop) in_loop.push(arg.defined())
    }
    return true
  }

  function can_inject_vars (block, safe) {
    const len = fn.body.length
    let i, j, stat, name
    for (i = 0; i < len; i++) {
      stat = fn.body[i]
      if (!(stat instanceof ast_var)) continue
      if (!safe) return false
      for (j = stat.defs.length; --j >= 0;) {
        name = stat.defs[j].name
        if (name instanceof ast_destructure || block.has(name.name)
          || identifier_atom.has(name.name) || scope.conflicting_def(name.name, name.file)) return false
        if (in_loop) in_loop.push(name.defined())
      }
    }
    return true
  }

  function can_inject_symbols () {
    const block = new Set()
    do {
      scope = comp.parent(++level)
      if (scope.is_block_scope() && scope.blocks) scope.blocks.variables.forEach(function (variable) { block.add(variable.name) })
      if (scope instanceof ast_catch) {
        if (scope.argname) block.add(scope.argname.name)
      } else if (scope instanceof ast_iteration_statement) {
        in_loop = []
      } else if (scope instanceof ast_symbol_ref) {
        if (scope.fixed_value() instanceof ast_scope) return false
      }
    } while (!(scope instanceof ast_scope))
    const safe = !(scope instanceof ast_toplevel) || comp.toplevel.vars
    const inline = comp.options['inline']
    if (!can_inject_vars(block, inline >= 3 && safe)) return false
    if (!can_inject_args(block, inline >= 2 && safe)) return false
    return !in_loop || in_loop.length == 0 || !is_reachable(fn, in_loop)
  }

  function append_var (decls, expressions, name, value) {
    const defined = name.defined()
    const node_name = name.file + '/' + name.name
    const already_appended = scope.variables.has(node_name)
    if (!already_appended) {
      scope.variables.set(node_name, defined)
      scope.encl.push(defined)
      decls.push(make_node(ast_var_def, name, {name: name, value: null}))
    }
    const sym = make_node(ast_symbol_ref, name, name)
    defined.references.push(sym)
    if (value) expressions.push(make_node(ast_assign, self, {operator: '=', logical: false, left: sym, right: value.copy()}))
  }

  function flatten_args (decls, expressions) {
    let len = fn.argnames.length, i
    for (i = self.args.length; --i >= len;) {
      expressions.push(self.args[i])
    }
    let name, value, symbol
    for (i = len; --i >= 0;) {
      name = fn.argnames[i]
      value = self.args[i]
      if (has_flag(name, unused_flag) || !name.name || scope.conflicting_def(name.name, name.file)) {
        if (value) expressions.push(value)
      } else {
        symbol = make_node(ast_symbol_var, name, name)
        name.defined().orig.push(symbol)
        if (!value && in_loop) value = make_node(ast_undefined, self)
        append_var(decls, expressions, symbol, value)
      }
    }
    decls.reverse()
    expressions.reverse()
  }

  function flatten_vars (decls, expressions) {
    const pos = expressions.length
    let i = 0, lines = fn.body.length, stat, j, defs, var_def, name, defined, sym
    for (; i < lines; i++) {
     stat = fn.body[i]
      if (!(stat instanceof ast_var)) continue
      for (j = 0, defs = stat.defs.length; j < defs; j++) {
        var_def = stat.defs[j]
        name = var_def.name
        append_var(decls, expressions, name, var_def.value)
        if (in_loop && fn.argnames.every((argname) => argname.name != name.name)) {
          const node_name = name.file + '/' + name.name
          defined = fn.variables.get(node_name)
          sym = make_node(ast_symbol_ref, name, name)
          defined.references.push(sym)
          expressions.splice(pos++, 0, make_node(ast_assign, var_def, {operator: '=', logical: false,
            left: sym, right: make_node(ast_undefined, name)}))
        }
      }
    }
  }

  function flatten_fn (returned_value) {
    const decls = []
    const expressions = []
    flatten_args(decls, expressions)
    flatten_vars(decls, expressions)
    expressions.push(returned_value)
    if (decls.length) {
      const i = scope.body.indexOf(comp.parent(level - 1)) + 1
      scope.body.splice(i, 0, make_node(ast_var, fn, {defs: decls}))
    }
    return expressions.map(expr => expr.copy(true))
  }
}

function merge_sequence (array, root) {
  root instanceof ast_sequence ? array.push(...root.expressions) : array.push(root)
  return array
}

function make_sequence (orig, expressions) {
  if (expressions.length == 1) return expressions[0]
  if (expressions.length == 0) throw new Error('trying to create a sequence with length zero!')
  return make_node(ast_sequence, orig, {expressions: expressions.reduce(merge_sequence, [])})
}

function make_node_from_constant (val, orig) {
  switch (typeof val) {
    case 'string':
      return make_node(ast_string, orig, {value: val})
    case 'number':
      if (isNaN(val)) return make_node(ast_nan, orig)
      if (isFinite(val)) {
        return 1 / val < 0 ? make_node(ast_unary_prefix, orig, {operator: '-', expr: make_node(ast_number, orig, {value: -val})})
          : make_node(ast_number, orig, {value: val})
      }
      return val < 0 ? make_node(ast_unary_prefix, orig, {operator: '-', expr: make_node(ast_infinity, orig)}) : make_node(ast_infinity, orig)
    case 'bigint':
      return make_node(ast_big_int, orig, {value: val.toString() })
    case 'boolean':
      return make_node(val ? ast_true : ast_false, orig)
    case 'undefined':
      return make_node(ast_undefined, orig)
    default:
      if (val === null) return make_node(ast_null, orig, {value: null})
      if (val instanceof RegExp) return make_node(ast_reg_exp, orig, {value: {source: source_regexp(val.source), flags: val.flags}})
      throw new Error('type ' + {type: typeof val})
  }
}

function best_of_expression (ast1, ast2) {
  return ast1.size() > ast2.size() ? ast2 : ast1
}

function best_of_statement (ast1, ast2) {
  return best_of_expression(make_node(ast_statement, ast1, {body: ast1}),
    make_node(ast_statement, ast2, {body: ast2})).body
}

function best_of (comp, ast1, ast2) {
  return first_in_statement(comp) ? best_of_statement(ast1, ast2) : best_of_expression(ast1, ast2)
}

function get_simple_key (key) {
  if (key instanceof ast_literal) return key.getValue()
  if (key instanceof ast_unary_prefix && key.operator == 'void' && key.expr instanceof ast_literal) return
  return key
}

function read_property (obj, key) {
  key = get_simple_key(key)
  if (key instanceof tree) return
  let value
  if (obj instanceof ast_array) {
    const elements = obj.elements
    if (key == 'length') return make_node_from_constant(elements.length, obj)
    if (typeof key == 'number' && key in elements) value = elements[key]
  } else if (obj instanceof ast_object) {
    key = '' + key
    const props = obj.properties
    let prop
    for (let i = props.length; --i >= 0;) {
      prop = props[i]
      if (!(prop instanceof ast_key_value)) return
      if (!value && prop.key === key) value = prop.value
    }
  }
  return value instanceof ast_symbol_ref && value.fixed_value() || value
}

function has_break_or_continue (loop, parent) {
  let found = false
  const trees = new observes(function (root) {
    if (found || root instanceof ast_scope) return true
    if (root instanceof ast_loop_control && trees.loopcontrol(root) === loop) return found = true
  })
  if (parent instanceof ast_labeled_statement) trees.push(parent)
  trees.push(loop)
  loop.body.observe(trees)
  return found
}

function maintain_bind (parent, orig, val) {
  if (parent instanceof ast_unary_prefix && parent.operator == 'delete' || parent instanceof ast_call && parent.expr === orig
      && (val instanceof ast_chain || val instanceof ast_prop_access || val instanceof ast_symbol_ref && val.name == 'eval')) {
    const zero = make_node(ast_number, orig, {value: 0})
    return make_sequence(orig, [ zero, val ])
  } else {
    return val
  }
}

function is_func_expr (root) {
  return root instanceof ast_arrow || root instanceof ast_function
}

function is_iife_call (root) {
  if (root.type != 'ast_call') return false
  return root.expr instanceof ast_function || is_iife_call(root.expr)
}

function is_empty (thing) {
  if (thing === null) return true
  if (thing instanceof ast_empty_statement) return true
  if (thing instanceof ast_block_statement) return thing.body.length == 0
  return false
}

const identifier_atom = make_set('Infinity NaN undefined')

function is_identifier_atom (root) {
  return root instanceof ast_infinity
    || root instanceof ast_nan
    || root instanceof ast_undefined
}

function ref_of (ref, type) {
  if (!(ref instanceof ast_symbol_ref)) return false
  const orig = ref.defined().orig
  for (let i = orig.length; --i >= 0;) {
    if (orig[i] instanceof type) return true
  }
}

function evictable (root) {
  return !(root instanceof ast_def_class || root instanceof ast_defun || root instanceof ast_let
    || root instanceof ast_const || root instanceof ast_export || root instanceof ast_import)
}

function as_statement_array (thing) {
  if (thing === null) return []
  if (thing instanceof ast_block_statement) return thing.body
  if (thing instanceof ast_empty_statement) return []
  if (thing instanceof ast_state) return [ thing ]
  throw new Error('cannot convert to statement array')
}

function is_reachable (scope_node, defs) {
  function find_ref (root) {
    if (root instanceof ast_symbol_ref && member(root.defined(), defs)) return walk_abort
  }
  return walk_parent(scope_node, (root, info) => {
    if (root instanceof ast_scope && root !== scope_node) {
      const parent = info.parent()
      if (parent instanceof ast_call && parent.expr === root && !(root.sync || root.gen)) return
      if (observe(root, find_ref)) return walk_abort
      return true
    }
  })
}

function is_recursive_ref (comp, defined) {
  let root, name
  for (let i = 0; root = comp.parent(i); i++) {
    if (root instanceof ast_lambda || root instanceof ast_class) {
      name = root.name
      if (name && name.defined() === defined) return true
    }
  }
  return false
}

function retain_top_func (fn, comp) {
  return comp.top_retain && fn instanceof ast_defun && has_flag(fn, topped_flag)
    && fn.name && comp.top_retain(fn.name.defined())
}

class Compressor extends observes {
  constructor (options, { false_by_default = false, mangle_options = false}) {
    super()
    this.imports = mangle_options.imports
    if (options.defaults !== undefined && !options.defaults) false_by_default = true
    const not_false = !false_by_default
    this.options = defaults(options, {'arguments': false, 'arrows': not_false, 'booleans': not_false,
      'collapse_vars': not_false, 'comparisons': not_false, 'computed_props': not_false, 'conditionals': not_false,
      'dead_code': not_false, 'defaults': true, 'directives': not_false, 'drop_console': false, 'drop_debugger': not_false,
      'evaluate': not_false, 'expr': false, 'global_defs': false, 'hoist_props': not_false, 'if_return': not_false,
      'inline': not_false, 'join_vars': not_false, 'keep_fargs': true, 'keep_infinity': false, 'lhs_constants': not_false,
      'loops': not_false, 'module': false, 'negate_iife': not_false, 'passes': 1, 'properties': not_false,
      'pure_getters': not_false && 'strict', 'pure_funcs': null, 'reduce_funcs': not_false, 'reduce_vars': not_false,
      'sequences': not_false, 'side_effects': not_false, 'switches': not_false, 'top_retain': null,
      'toplevel': !!(options && options['top_retain']), 'typeofs': not_false, 'unused': not_false,
    })
    const global_defs = this.options['global_defs']
    if (typeof global_defs == 'object') {
      for (let key in global_defs) {
        if (key[0] == '@') global_defs[key.slice(1)] = parse(global_defs[key], {expr: true})
      }
    }
    if (this.options['inline'] === true) this.options['inline'] = 3
    const pure_funcs = this.options['pure_funcs']
    if (typeof pure_funcs == 'function') {
      this.pure_funcs = pure_funcs
    } else {
      this.pure_funcs = pure_funcs ? function (root) {
        return !member(root.expr.print_to_string(), pure_funcs)
      } : return_true
    }
    const top_retain = this.options['top_retain']
    if (top_retain instanceof RegExp) {
      this.top_retain = function (defined) { return top_retain.test(defined.name) }
    } else if (typeof top_retain == 'function') {
      this.top_retain = top_retain
    } else if (top_retain) {
      if (typeof top_retain == 'string') top_retain = top_retain.split(/,/)
      this.top_retain = function (defined) { return member(defined.name, top_retain) }
    }
    if (this.options['module']) this.options['toplevel'] = true
    const toplevel = this.options['toplevel']
    this.toplevel = typeof toplevel == 'string' ? {funcs: /funcs/.test(toplevel), vars: /vars/.test(toplevel)} : {funcs: toplevel, vars: toplevel}
    const sequences = this.options['sequences']
    this.sequences_limit = sequences == 1 ? 800 : sequences | 0
    this.evaluated_regexps = new Map()
    this._toplevel = undefined
    this._mangle_options = mangle_options ? format_mangler_options(mangle_options) : mangle_options
  }

  mangle_options () {
    const nth = this._mangle_options && this._mangle_options.nth || base54
    const module = this._mangle_options && this._mangle_options.module || this.options['module']
    const imports = this.imports
    return {nth, module, imports}
  }

  exposed (defined) {
    if (defined.export) return true
    if (defined.global) {
      for (let i = 0, len = defined.orig.length; i < len; i++) {
        if (!this.toplevel[defined.orig[i] instanceof ast_symbol_defun ? 'funcs' : 'vars']) return true
      }
    }
    return false
  }

  in_boolean_context () {
    if (!this.options['booleans']) return false
    let self = this.self()
    for (let i = 0, p; p = this.parent(i); i++) {
      if (p instanceof ast_statement || p instanceof ast_conditional && p.condition === self
        || p instanceof ast_do_loop && p.condition === self || p instanceof ast_for && p.condition === self
        || p instanceof ast_if && p.condition === self || p instanceof ast_unary_prefix && p.operator == '!' && p.expr === self) {
        return true
      }
      if (p instanceof ast_binary && (p.operator == '&&' || p.operator == '||' || p.operator == '??')
        || p instanceof ast_conditional || p.tail_node() === self) {
        self = p
      } else {
        return false
      }
    }
  }

  in_32_bit_context () {
    let self = this.self()
    for (let i = 0, p; p = this.parent(i); i++) {
      if (p instanceof ast_binary && bitwise_binop.has(p.operator)) return true
      if (p instanceof ast_unary_prefix) return p.operator == '~'
      if (p instanceof ast_binary && ( p.operator == '&&' || p.operator == '||' || p.operator == '??')
        || p instanceof ast_conditional && p.condition !== self || p.tail_node() === self) {
        self = p
      } else {
        return false
      }
    }
  }

  in_computed_key () {
    let self = this.self()
    for (let i = 0, p; p = this.parent(i); i++) {
      if (p instanceof ast_object_property && p.key === self) return true
    }
    return false
  }

  get_toplevel () {
    return this._toplevel
  }

  compress (toplevel) {
    toplevel = toplevel.resolve_defines(this)
    this._toplevel = toplevel
    if (this.options['expr']) this._toplevel.process_expression(true)
    const passes = +this.options.passes || 1, min_count = 1 / 0, mangle = this.mangle_options()
    let stopping = false, pass
    for (pass = 0; pass < passes; pass++) {
      this._toplevel.figure_out_scope(mangle)
      if (pass === 0 && this.options['drop_console']) {
        this._toplevel = this._toplevel.drop_console(this.options['drop_console'])
      }
      if (pass > 0 || this.options['reduce_vars']) this._toplevel.reset_opt_flags(this)
      this._toplevel = this._toplevel.transform(this)
      if (passes > 1) {
        let count = 0
        observe(this._toplevel, () => { count++ })
        if (count < min_count) {
          min_count = count
          stopping = false
        } else if (stopping) {
          break
        } else {
          stopping = true
        }
      }
    }
    if (this.options['expr']) this._toplevel.process_expression(false)
    toplevel = this._toplevel
    this._toplevel = undefined
    return toplevel
  }

  before (root, ascend) {
    if (has_flag(root, squeezed_flag)) return root
    let was_scope = false
    if (root instanceof ast_scope) {
      root = root.hoist_properties(this)
      was_scope = true
    }
    ascend(root, this)
    ascend(root, this)
    const opt = root.optimize(this)
    if (was_scope && opt instanceof ast_scope) {
      opt.drop_unused(this)
      ascend(opt, this)
    }
    if (opt === root) set_flag(opt, squeezed_flag)
    return opt
  }
  is_lhs () {
    const self = this.stack[this.stack.length - 1]
    const parent = this.stack[this.stack.length - 2]
    return is_lhs(self, parent)
  }
}

function def_optimize (root, optimizer) {
  root.prototype.optimize = function (comp) {
    const self = this
    if (has_flag(self, optimized_flag)) return self
    if (comp.has_directive('use asm')) return self
    const opt = optimizer(self, comp)
    set_flag(opt, optimized_flag)
    return opt
  }
}

def_optimize(tree, function (self) { return self })

ast_toplevel.prototype.drop_console = function (options) {
  const is_array = Array.isArray(options)
  return this.transform(new transforms(function (self) {
    if (self.type !== 'ast_call') return
    const expr = self.expr
    if (!(expr instanceof ast_prop_access)) return
    if (is_array && options.indexOf(expr.property) === -1) return
    const name = expr.expr
    while (name.expr) name = name.expr
    if (is_undeclared_ref(name) && name.name == 'console') return make_node(ast_undefined, self)
  }))
}

tree.prototype.equivalent_to = function (root) {
  return equivalent_to(this, root)
}

ast_scope.prototype.process_expression = function (insert, comp) {
  const self = this
  const trans = new transforms(function (root) {
    if (insert && root instanceof ast_statement) return make_node(ast_return, root, {value: root.body})
    if (!insert && root instanceof ast_return) {
      if (comp) {
        const value = root.value && root.value.drop(comp, true)
        return value ? make_node(ast_statement, root, {body: value}) : make_node(ast_empty_statement, root)
      }
      return make_node(ast_statement, root, {
        body: root.value || make_node(ast_unary_prefix, root, {
          operator: 'void',
          expr: make_node(ast_number, root, {value: 0})
        })
      })
    }
    if (root instanceof ast_class || root instanceof ast_lambda && root !== self) return root
    if (root instanceof ast_block) {
      const index = root.body.length - 1
      if (index >= 0) root.body[index] = root.body[index].transform(trans)
    } else if (root instanceof ast_if) {
      root.body = root.body.transform(trans)
      if (root.alt) root.alt = root.alt.transform(trans)
    } else if (root instanceof ast_with) {
      root.body = root.body.transform(trans)
    }
    return root
  })
  self.transform(trans)
}

ast_toplevel.prototype.reset_opt_flags = function (comp) {
  const self = this
  const reduce_vars = comp.options['reduce_vars']
  const preparation = new observes(function (root, ascend) {
    clear_flag(root, pass_flag)
    if (reduce_vars) {
      if (comp.top_retain && root instanceof ast_defun && preparation.parent() === self) set_flag(root, topped_flag)
      return root.reduce_vars(preparation, ascend, comp)
    }
  })
  preparation.safe = Object.create(null)
  preparation.in_loop = null
  preparation.loop_ids = new Map()
  preparation.defs_to_safe_ids = new Map()
  self.observe(preparation)
}

ast_symbol.prototype.fixed_value = function () {
  const fixed = this.thedef.fixed
  if (!fixed || fixed instanceof tree) return fixed
  return fixed()
}

ast_symbol_ref.prototype.is_immutable = function () {
  const orig = this.defined().orig
  return orig.length == 1 && orig[0] instanceof ast_symbol_lambda
}

function find_variable (comp, name) {
  let scope, i = 0
  while (scope = comp.parent(i++)) {
    if (scope instanceof ast_scope) break
    if (scope instanceof ast_catch && scope.argname) {
      scope = scope.argname.defined().scope
      break
    }
  }
  const node_name = name.name + '/' + name.file
  return scope.find_variable(node_name, comp.imports)
}

ast_symbol_ref.prototype.is_declared = function () {
  return !this.defined().undeclared
}

const directives = new Set(['use asm', 'use strict'])

def_optimize(ast_directive, function (self, comp) {
  if (comp.options['directives'] && (!directives.has(self.value) || comp.has_directive(self.value) !== self)) {
    return make_node(ast_empty_statement, self)
  }
  return self
})

def_optimize(ast_labeled_statement, function (self, comp) {
  if (self.body instanceof ast_break && comp.loopcontrol(self.body) === self.body) return make_node(ast_empty_statement, self)
  return self.label.references.length == 0 ? self.body : self
})

def_optimize(ast_block, function (self, comp) {
  tighten_body(self.body, comp)
  return self
})

function can_be_extracted (root) {
  return !(root instanceof ast_const || root instanceof ast_let || root instanceof ast_class)
}

def_optimize(ast_block_statement, function (self, comp) {
  tighten_body(self.body, comp)
  switch (self.body.length) {
    case 1:
      if (comp.parent() instanceof ast_if && can_be_extracted(self.body[0]) || evictable(self.body[0])) return self.body[0]
      break
    case 0: return make_node(ast_empty_statement, self)
  }
  return self
})

function opt_lambda (self, comp) {
  tighten_body(self.body, comp)
  return self
}

def_optimize(ast_lambda, opt_lambda)

ast_scope.prototype.hoist_properties = function (comp) {
  const self = this
  if (!comp.options['hoist_props'] || comp.has_directive('use asm')) return self
  const top_retain = self instanceof ast_toplevel && comp.top_retain || return_false
  const defs_by_id = new Map()
  const hoister = new transforms(function (root, ascend) {
    if (root instanceof ast_var_def) {
      const sym = root.name
      let defined, value
      if (sym.scope === self && (defined = sym.defined()).escaped != 1 && !defined.assignments
        && !defined.direct_access && !defined.single_use && !comp.exposed(defined) && !top_retain(defined)
        && (value = sym.fixed_value()) === root.value && value instanceof ast_object
        && !value.properties.some(prop => prop instanceof ast_spread || prop.computed_key())) {
        ascend(root, this)
        const defs = new Map()
        const assignments = []
        value.properties.forEach(({key, value}) => {
          const scope = hoister.find_scope()
          const symbol = self.create_symbol(sym.constructor, {source: sym, scope, conflict_scopes: new Set([scope,
            ...sym.defined().references.map(ref => ref.scope)]), tentative_name: sym.name + '_' + key})
          defs.set(String(key), symbol.defined())
          assignments.push(make_node(ast_var_def, root, { name: symbol, value}))
        })
        defs_by_id.set(defined.id, defs)
        return _splice(assignments)
      }
    } else if (root instanceof ast_prop_access && root.expr instanceof ast_symbol_ref) {
      const defs = defs_by_id.get(root.expr.defined().id)
      if (defs) {
        const defined = defs.get(String(get_simple_key(root.property)))
        const sym = make_node(ast_symbol_ref, root, {name: defined.name, scope: root.expr.scope, thedef: defined})
        sym.reference({})
        return sym
      }
    }
  })
  return self.transform(hoister)
}

def_optimize(ast_statement, function (self, comp) {
  if (comp.options['side_effects']) {
    const body = self.body
    const root = body.drop(comp, true)
    if (!root) return make_node(ast_empty_statement, self)
    if (root !== body) return make_node(ast_statement, self, {body: root})
  }
  return self
})

def_optimize(ast_while, function (self, comp) {
  return comp.options['loops'] ? make_node(ast_for, self, self).optimize(comp) : self
})

def_optimize(ast_do, function (self, comp) {
  if (!comp.options['loops']) return self
  const cond = self.condition.tail_node().evaluate(comp)
  if (!(cond instanceof tree)) {
    if (cond) return make_node(ast_for, self, {
      body: make_node(ast_block_statement, self.body, {
        body: [self.body, make_node(ast_statement, self.condition, {body: self.condition})]
      })
    }).optimize(comp)
    if (!has_break_or_continue(self, comp.parent())) {
      return make_node(ast_block_statement, self.body, {
        body: [self.body, make_node(ast_statement, self.condition, {body: self.condition})]
      }).optimize(comp)
    }
  }
  return self
})

function if_break_in_loop (self, comp) {
  const first = self.body instanceof ast_block_statement ? self.body.body[0] : self.body
  if (comp.options['dead_code'] && is_break(first)) {
    const body = []
    if (self.init instanceof ast_state) {
      body.push(self.init)
    } else if (self.init) {
      body.push(make_node(ast_statement, self.init, {body: self.init}))
    }
    if (self.condition) body.push(make_node(ast_statement, self.condition, {body: self.condition}))
    trim_code(comp, self.body, body)
    return make_node(ast_block_statement, self, {body})
  }
  if (first instanceof ast_if) {
    if (is_break(first.body)) {
      if (self.condition) {
        self.condition = make_node(ast_binary, self.condition, {left: self.condition, operator: '&&', right: first.condition.negate(comp)})
      } else {
        self.condition = first.condition.negate(comp)
      }
      drop_it(first.alt)
    } else if (is_break(first.alt)) {
      if (self.condition) {
        self.condition = make_node(ast_binary, self.condition, {left: self.condition, operator: '&&', right: first.condition})
      } else {
        self.condition = first.condition
      }
      drop_it(first.body)
    }
  }
  return self

  function is_break (root) {
    return root instanceof ast_break && comp.loopcontrol(root) === comp.self()
  }

  function drop_it (rest) {
    rest = as_statement_array(rest)
    if (self.body instanceof ast_block_statement) {
      self.body = self.body.copy()
      self.body.body = rest.concat(self.body.body.slice(1))
      self.body = self.body.transform(comp)
    } else {
      self.body = make_node(ast_block_statement, self.body, {
        body: rest
      }).transform(comp)
    }
    self = if_break_in_loop(self, comp)
  }
}

def_optimize(ast_for, function (self, comp) {
  if (!comp.options['loops']) return self
  if (comp.options['side_effects'] && self.init) self.init = self.init.drop(comp)
  if (self.condition) {
    let cond = self.condition.evaluate(comp)
    if (!(cond instanceof tree)) {
      if (cond) {
        self.condition = null
      } else if (!comp.options['dead_code']) {
        const orig = self.condition
        self.condition = make_node_from_constant(cond, self.condition)
        self.condition = best_of_expression(self.condition.transform(comp), orig)
      }
    }
    if (comp.options['dead_code']) {
      if (cond instanceof tree) cond = self.condition.tail_node().evaluate(comp)
      if (!cond) {
        const body = []
        trim_code(comp, self.body, body)
        if (self.init instanceof ast_state) {
          body.push(self.init)
        } else if (self.init) {
          body.push(make_node(ast_statement, self.init, {body: self.init}))
        }
        body.push(make_node(ast_statement, self.condition, {body: self.condition}))
        return make_node(ast_block_statement, self, {body}).optimize(comp)
      }
    }
  }
  return if_break_in_loop(self, comp)
})

def_optimize(ast_if, function (self, comp) {
  if (is_empty(self.alt)) self.alt = null
  if (!comp.options['conditionals']) return self
  let cond = self.condition.evaluate(comp)
  if (!comp.options['dead_code'] && !(cond instanceof tree)) {
    const orig = self.condition
    self.condition = make_node_from_constant(cond, orig)
    self.condition = best_of_expression(self.condition.transform(comp), orig)
  }
  if (comp.options['dead_code']) {
    if (cond instanceof tree) cond = self.condition.tail_node().evaluate(comp)
    if (!cond) {
      const body = []
      trim_code(comp, self.body, body)
      body.push(make_node(ast_statement, self.condition, {body: self.condition}))
      if (self.alt) body.push(self.alt)
      return make_node(ast_block_statement, self, {body}).optimize(comp)
    } else if (!(cond instanceof tree)) {
      const body = []
      body.push(make_node(ast_statement, self.condition, {body: self.condition}))
      body.push(self.body)
      if (self.alt) trim_code(comp, self.alt, body)
      return make_node(ast_block_statement, self, {body}).optimize(comp)
    }
  }
  const negated = self.condition.negate(comp), condition_length = self.condition.size()
  const negated_length = negated.size()
  let negated_is_best = negated_length < condition_length
  if (self.alt && negated_is_best) {
    negated_is_best = false
    self.condition = negated
    const tmp = self.body
    self.body = self.alt || make_node(ast_empty_statement, self)
    self.alt = tmp
  }
  if (is_empty(self.body) && is_empty(self.alt)) {
    return make_node(ast_statement, self.condition, {body: self.condition.copy()}).optimize(comp)
  }
  if (self.body instanceof ast_statement && self.alt instanceof ast_statement) {
    return make_node(ast_statement, self, {
      body: make_node(ast_conditional, self, {
        condition: self.condition,
        consequent: self.body.body,
        alt: self.alt.body
      })
    }).optimize(comp)
  }
  if (is_empty(self.alt) && self.body instanceof ast_statement) {
    if (condition_length == negated_length && !negated_is_best && self.condition instanceof ast_binary && self.condition.operator == '||') {
      negated_is_best = true
    }
    if (negated_is_best) return make_node(ast_statement, self, {
      body: make_node(ast_binary, self, {
        operator: '||',
        left: negated,
        right: self.body.body
      })
    }).optimize(comp)
    return make_node(ast_statement, self, {
      body: make_node(ast_binary, self, {
        operator: '&&',
        left: self.condition,
        right: self.body.body
      })
    }).optimize(comp)
  }
  if (self.body instanceof ast_empty_statement && self.alt instanceof ast_statement) {
    return make_node(ast_statement, self, {
      body: make_node(ast_binary, self, {
        operator: '||',
        left: self.condition,
        right: self.alt.body
      })
    }).optimize(comp)
  }
  if (self.body instanceof ast_exit && self.alt instanceof ast_exit && self.body.type == self.alt.type) {
    return make_node(self.body.constructor, self, {
      value: make_node(ast_conditional, self, {
        condition: self.condition,
        consequent: self.body.value || make_node(ast_undefined, self.body),
        alt: self.alt.value || make_node(ast_undefined, self.alt)
      }).transform(comp)
    }).optimize(comp)
  }
  if (self.body instanceof ast_if && !self.body.alt && !self.alt) {
    self = make_node(ast_if, self, {
      condition: make_node(ast_binary, self.condition, {operator: '&&', left: self.condition, right: self.body.condition}),
      body: self.body.body,
      alt: null
    })
  }
  if (aborts(self.body)) {
    if (self.alt) {
      const alt = self.alt
      self.alt = null
      return make_node(ast_block_statement, self, {body: [self, alt]}).optimize(comp)
    }
  }
  if (aborts(self.alt)) {
    const body = self.body
    self.body = self.alt
    self.condition = negated_is_best ? negated : self.condition.negate(comp)
    self.alt = null
    return make_node(ast_block_statement, self, {body: [self, body]}).optimize(comp)
  }
  return self
})

def_optimize(ast_switch, function (self, comp) {
  if (!comp.options['switches']) return self
  let value = self.expr.evaluate(comp), branch
  if (!(value instanceof tree)) {
    const orig = self.expr
    self.expr = make_node_from_constant(value, orig)
    self.expr = best_of_expression(self.expr.transform(comp), orig)
  }
  if (!comp.options['dead_code']) return self
  if (value instanceof tree) value = self.expr.tail_node().evaluate(comp)
  const decl = [], body = []
  let default_branch, exact_match, i, len, expr, default_index
  for (i = 0, len = self.body.length; i < len && !exact_match; i++) {
    branch = self.body[i]
    if (branch instanceof ast_default) {
      !default_branch ? default_branch = branch : eliminate_branch(branch, body[body.length - 1])
    } else if (!(value instanceof tree)) {
      expr = branch.expr.evaluate(comp)
      if (!(expr instanceof tree) && expr !== value) {
        eliminate_branch(branch, body[body.length - 1])
        continue
      }
      if (expr instanceof tree) expr = branch.expr.tail_node().evaluate(comp)
      if (expr === value) {
        exact_match = branch
        if (default_branch) {
          default_index = body.indexOf(default_branch)
          body.splice(default_index, 1)
          eliminate_branch(default_branch, body[default_index - 1])
          default_branch = null
        }
      }
    }
    body.push(branch)
  }
  while (i < len) eliminate_branch(self.body[i++], body[body.length - 1])
  self.body = body
  let default_or_exact = default_branch || exact_match
  default_branch = null
  exact_match = null
  if (body.every((branch, i) => (branch === default_or_exact || branch.expr instanceof ast_literal)
    && (branch.body.length === 0 || aborts(branch) || body.length - 1 === i))) {
    for (let i = 0; i < body.length; i++) {
      const branch = body[i]
      for (let j = i + 1; j < body.length; j++) {
        const next = body[j]
        if (next.body.length === 0) continue
        const has_branch = j === (body.length - 1)
        const equivalent_branch = branches_equivalent(next, branch, false)
        if (equivalent_branch || (has_branch && branches_equivalent(next, branch, true))) {
          if (!equivalent_branch && has_branch) next.body.push(make_node(ast_break))
          let x = j - 1, depth = 0
          while (x > i) {
            if (is_inert_body(body[x--])) {
              depth++
            } else {
              break
            }
          }
          const plucked = body.splice(j - depth, 1 + depth)
          body.splice(i + 1, 0, ...plucked)
          i += plucked.length
        }
      }
    }
  }
  for (let i = 0; i < body.length; i++) {
    let branch = body[i]
    if (branch.body.length === 0) continue
    if (!aborts(branch)) continue
    for (let j = i + 1; j < body.length; i++, j++) {
      let next = body[j]
      if (next.body.length === 0) continue
      if (branches_equivalent(next, branch, false) || (j === body.length - 1 && branches_equivalent(next, branch, true))) {
        branch.body = []
        branch = next
        continue
      }
      break
    }
  }
  {
    let i = body.length - 1
    for (; i >= 0; i--) {
      let branch_body = body[i].body
      if (is_break(branch_body[branch_body.length - 1], comp)) branch_body.pop()
      if (!is_inert_body(body[i])) break
    }
    i++
    if (!default_or_exact || body.indexOf(default_or_exact) >= i) {
      for (let j = body.length - 1; j >= i; j--) {
        let branch = body[j]
        if (branch === default_or_exact) {
          default_or_exact = null
          body.pop()
        } else if (!branch.expr.has_side_effects(comp)) {
          body.pop()
        } else {
          break
        }
      }
    }
  }
  default_or: if (default_or_exact) {
    let default_index = body.indexOf(default_or_exact)
    let default_body_index = default_index
    for (; default_body_index < body.length - 1; default_body_index++) {
      if (!is_inert_body(body[default_body_index])) break
    }
    if (default_body_index < body.length - 1) break default_or
    let side_effect_index = body.length - 1
    for (; side_effect_index >= 0; side_effect_index--) {
      let branch = body[side_effect_index]
      if (branch === default_or_exact) continue
      if (branch.expr.has_side_effects(comp)) break
    }
    if (default_body_index > side_effect_index) {
      let prev_body_index = default_index - 1
      for (; prev_body_index >= 0; prev_body_index--) {
        if (!is_inert_body(body[prev_body_index])) break
      }
      let before = Math.max(side_effect_index, prev_body_index) + 1
      let after = default_index
      if (side_effect_index > default_index) {
        after = side_effect_index
        body[side_effect_index].body = body[default_body_index].body
      } else {
        default_or_exact.body = body[default_body_index].body
      }
      body.splice(after + 1, default_body_index - after)
      body.splice(before, default_index - before)
    }
  }
  default_or: if (default_or_exact) {
    let i = body.findIndex(branch => !is_inert_body(branch))
    let case_body
    if (i === body.length - 1) {
      let branch = body[i]
      if (has_nested_break(self)) break default_or
      case_body = make_node(ast_block_statement, branch, {body: branch.body})
      branch.body = []
    } else if (i !== -1) {
      break default_or
    }
    if (!body.find(branch => branch !== default_or_exact && branch.expr.has_side_effects(comp))) {
      return make_node(ast_block_statement, self, {
        body: decl.concat(statement(self.expr), default_or_exact.expr ? statement(default_or_exact.expr) : [], case_body || [])
      }).optimize(comp)
    }
    const default_index = body.indexOf(default_or_exact)
    body.splice(default_index, 1)
    default_or_exact = null
    if (case_body) return make_node(ast_block_statement, self, {body: decl.concat(self, case_body)}).optimize(comp)
  }
  if (body.length > 0) body[0].body = decl.concat(body[0].body)
  if (body.length == 0) return make_node(ast_block_statement, self, {body: decl.concat(statement(self.expr))}).optimize(comp)
  if (body.length == 1 && !has_nested_break(self)) {
    let branch = body[0]
    return make_node(ast_if, self, {
      condition: make_node(ast_binary, self, {operator: '===', left: self.expr, right: branch.expr}),
      body: make_node(ast_block_statement, branch, {body: branch.body}),
      alt: null
    }).optimize(comp)
  }
  if (body.length === 2 && default_or_exact && !has_nested_break(self)) {
    let branch = body[0] === default_or_exact ? body[1] : body[0]
    let exact_exp = default_or_exact.expr && statement(default_or_exact.expr)
    if (aborts(body[0])) {
      let first = body[0]
      if (is_break(first.body[first.body.length - 1], comp)) first.body.pop()
      return make_node(ast_if, self, {
        condition: make_node(ast_binary, self, {
          operator: '===',
          left: self.expr,
          right: branch.expr,
        }),
        body: make_node(ast_block_statement, branch, {body: branch.body}),
        alt: make_node(ast_block_statement, default_or_exact, {
          body: [].concat(exact_exp || [], default_or_exact.body)
        })
      }).optimize(comp)
    }
    let operator = '==='
    let consequent = make_node(ast_block_statement, branch, {body: branch.body})
    let always = make_node(ast_block_statement, default_or_exact, {
      body: [].concat(exact_exp || [], default_or_exact.body)
    })
    if (body[0] === default_or_exact) {
      operator = '!=='
      let tmp = always
      always = consequent
      consequent = tmp
    }
    return make_node(ast_block_statement, self, {
      body: [
        make_node(ast_if, self, {
          condition: make_node(ast_binary, self, {
            operator: operator,
            left: self.expr,
            right: branch.expr,
          }),
          body: consequent,
          alt: null
        })
      ].concat(always)
    }).optimize(comp)
  }
  return self

  function eliminate_branch (branch, prev) {
    prev && !aborts(prev) ? prev.body = prev.body.concat(branch.body) : trim_code(comp, branch, decl)
  }
  function branches_equivalent (branch, prev, insert_break) {
    let branch_body = branch.body
    let prev_body = prev.body
    if (insert_break) branch_body = branch_body.concat(make_node(ast_break))
    if (branch_body.length !== prev_body.length) return false
    let branch_block = make_node(ast_block_statement, branch, {body: branch_body})
    let prev_block = make_node(ast_block_statement, prev, {body: prev_body})
    return branch_block.equivalent_to(prev_block)
  }
  function statement (expr) {
    return make_node(ast_statement, expr, {
      body: expr
    })
  }
  function has_nested_break (root) {
    let has_break = false
    let trees = new observes(root => {
      if (has_break) return true
      if (root instanceof ast_lambda) return true
      if (root instanceof ast_statement) return true
      if (!is_break(root, trees)) return
      let parent = trees.parent()
      if (parent instanceof ast_switch_branch && parent.body[parent.body.length - 1] === root) return
      has_break = true
    })
    root.observe(trees)
    return has_break
  }
  function is_break (root, stack) {
    return root instanceof ast_break && stack.loopcontrol(root) === self
  }
  function is_inert_body (branch) {
    return !aborts(branch) && !make_node(ast_block_statement, branch, {
      body: branch.body}).has_side_effects(comp)
  }
})

def_optimize(ast_try, function (self, comp) {
  if (self.bcatch && self.bfinally && self.bfinally.body.every(is_empty)) self.bfinally = null
  if (comp.options['dead_code'] && self.body.body.every(is_empty)) {
    const body = []
    if (self.bcatch) trim_code(comp, self.bcatch, body)
    if (self.bfinally) body.push(...self.bfinally.body)
    return make_node(ast_block_statement, self, {body}).optimize(comp)
  }
  return self
})

ast_definitions.prototype.to_assignments = function (comp) {
  const reduce_vars = comp.options['reduce_vars'], assignments = []
  let name
  for (const defined of this.defs) {
    if (defined.value) {
      name = make_node(ast_symbol_ref, defined.name, defined.name)
      assignments.push(make_node(ast_assign, defined, {operator: '=', logical: false, left: name, right: defined.value}))
      if (reduce_vars) name.defined().fixed = false
    }
    const thedef = defined.name.defined()
    thedef.eliminated++
    thedef.replaced--
  }
  if (assignments.length == 0) return
  return make_sequence(this, assignments)
}

def_optimize(ast_definitions, function (self) {
  if (self.defs.length == 0) return make_node(ast_empty_statement, self)
  return self
})

def_optimize(ast_var_def, function (self, comp) {
  if (self.name instanceof ast_symbol_let && self.value != null && is_undefined(self.value, comp)) self.value = null
  return self
})

def_optimize(ast_import, function (self) {
  return self
})

def_optimize(ast_call, function (self, comp) {
  const expr = self.expr
  let fn = expr
  inline_array_like_spread(self.args)
  const simple_args = self.args.every((arg) => !(arg instanceof ast_spread))
  if (comp.options['reduce_vars'] && fn instanceof ast_symbol_ref) fn = fn.fixed_value()
  const is_func = fn instanceof ast_lambda
  if (is_func && fn.pinned()) return self
  if (comp.options['unused'] && simple_args && is_func && !fn.uses_args) {
    let pos = 0, last = 0, root, trim
    for (let i = 0, len = self.args.length; i < len; i++) {
      if (fn.argnames[i] instanceof ast_spread) {
        if (has_flag(fn.argnames[i].expr, unused_flag)) while (i < len) {
          root = self.args[i++].drop(comp)
          if (root) self.args[pos++] = root
        } else {
          while (i < len) self.args[pos++] = self.args[i++]
        }
        last = pos
        break
      }
      trim = i >= fn.argnames.length
      if (trim || has_flag(fn.argnames[i], unused_flag)) {
        root = self.args[i].drop(comp)
        if (root) {
          self.args[pos++] = root
        } else if (!trim) {
          self.args[pos++] = make_node(ast_number, self.args[i], {value: 0})
          continue
        }
      } else {
        self.args[pos++] = self.args[i]
      }
      last = pos
    }
    self.args.length = last
  }
  return inline_into_call(self, comp)
})

tree.prototype.contains_optional = function () {
  if (this instanceof ast_prop_access || this instanceof ast_call || this instanceof ast_chain) {
    return this.optional ? true : this.expr.contains_optional()
  } else {
    return false
  }
}

def_optimize(ast_new, function (self, comp) {
  return self
})

def_optimize(ast_sequence, function (self, comp) {
  if (!comp.options['side_effects']) return self
  const expressions = []
  filter_for_side_effects()
  let end = expressions.length - 1
  trim_right_for_undefined()
  if (end == 0) {
    self = maintain_bind(comp.parent(), comp.self(), expressions[0])
    if (!(self instanceof ast_sequence)) self = self.optimize(comp)
    return self
  }
  self.expressions = expressions
  return self

  function filter_for_side_effects () {
    const last = self.expressions.length - 1
    let first = first_in_statement(comp)
    self.expressions.forEach(function (expr, index) {
      if (index < last) expr = expr.drop(comp, first)
      if (expr) {
        merge_sequence(expressions, expr)
        first = false
      }
    })
  }

  function trim_right_for_undefined () {
    while (end > 0 && is_undefined(expressions[end], comp)) end--
    if (end < expressions.length - 1) {
      expressions[end] = make_node(ast_unary_prefix, self, {
        operator: 'void',
        expr: expressions[end]
      })
      expressions.length = end + 1
    }
  }
})

ast_unary.prototype.lift_sequences = function (comp) {
  if (comp.options['sequences']) {
    if (this.expr instanceof ast_sequence) {
      const x = this.expr.expressions.slice()
      const expr = this.copy()
      expr.expr = x.pop()
      x.push(expr)
      return make_sequence(this, x).optimize(comp)
    }
  }
  return this
}

def_optimize(ast_unary_postfix, function (self, comp) {
  return self.lift_sequences(comp)
})

def_optimize(ast_unary_prefix, function (self, comp) {
  let expr = self.expr
  if (self.operator == 'delete' && !(expr instanceof ast_symbol_ref || expr instanceof ast_prop_access
      || expr instanceof ast_chain || is_identifier_atom(expr))) {
    return make_sequence(self, [expr, make_node(ast_true, self)]).optimize(comp)
  }
  const seq = self.lift_sequences(comp)
  if (seq !== self) return seq
  if (comp.options['side_effects'] && self.operator == 'void') {
    expr = expr.drop(comp)
    if (expr) {
      self.expr = expr
      return self
    } else {
      return make_node(ast_undefined, self).optimize(comp)
    }
  }
  if (comp.in_boolean_context()) {
    switch (self.operator) {
      case '!':
        if (expr instanceof ast_unary_prefix && expr.operator == '!') return expr.expr
        if (expr instanceof ast_binary) self = best_of(comp, self, expr.negate(comp, first_in_statement(comp)))
        break
      case 'typeof':
        return (expr instanceof ast_symbol_ref ? make_node(ast_true, self) : make_sequence(self, [expr, make_node(ast_true, self)])).optimize(comp)
    }
  }
  if (self.operator == '-' && expr instanceof ast_infinity) expr = expr.transform(comp)
  if (expr instanceof ast_binary && (self.operator == '+' || self.operator == '-')
    && (expr.operator == '*' || expr.operator == '/' || expr.operator == '%')) {
    return make_node(ast_binary, self, {
      operator: expr.operator,
      left: make_node(ast_unary_prefix, expr.left, {operator: self.operator, expr: expr.left}),
      right: expr.right
    })
  }

  if ('evaluate') {
    if (self.operator == '~' && self.expr instanceof ast_unary_prefix && self.expr.operator == '~'
      && (comp.in_32_bit_context() || self.expr.expr.is_32_bit_integer())) {
      return self.expr.expr
    }
    if (self.operator == '~' && expr instanceof ast_binary && expr.operator == '^') {
      if (expr.left instanceof ast_unary_prefix && expr.left.operator == '~') {
        expr.left = expr.left.bitwise_negate(true)
      } else {
        expr.right = expr.right.bitwise_negate(true)
      }
      return expr
    }
  }

  if (self.operator != '-' || !(expr instanceof ast_number || expr instanceof ast_infinity || expr instanceof ast_big_int)) {
    let ev = self.evaluate(comp)
    if (ev !== self) {
      ev = make_node_from_constant(ev, self).optimize(comp)
      return best_of(comp, ev, self)
    }
  }
  return self
})

ast_binary.prototype.lift_sequences = function (comp) {
  if (comp.options['sequences']) {
    if (this.left instanceof ast_sequence) {
      const x = this.left.expressions.slice()
      const expr = this.copy()
      expr.left = x.pop()
      x.push(expr)
      return make_sequence(this, x).optimize(comp)
    }
    if (this.right instanceof ast_sequence && !this.left.has_side_effects(comp)) {
      const assign = this.operator == '=' && this.left instanceof ast_symbol_ref
      let x = this.right.expressions, i, expr
      const last = x.length - 1
      for (i = 0; i < last; i++) {
        if (!assign && x[i].has_side_effects(comp)) break
      }
      if (i == last) {
        x = x.slice()
        expr = this.copy()
        expr.right = x.pop()
        x.push(expr)
        return make_sequence(this, x).optimize(comp)
      } else if (i > 0) {
        expr = this.copy()
        expr.right = make_sequence(this.right, x.slice(i))
        x = x.slice(0, i)
        x.push(expr)
        return make_sequence(this, x).optimize(comp)
      }
    }
  }
  return this
}

const commutative_operators = make_set('== === != !== * & | ^')

function is_object (root) {
  return root instanceof ast_array || root instanceof ast_lambda || root instanceof ast_object || root instanceof ast_class
}

def_optimize(ast_binary, function (self, comp) {
  function reversible () {
    return self.left.is_constant() || self.right.is_constant() || !self.left.has_side_effects(comp) && !self.right.has_side_effects(comp)
  }
  function reverse (op) {
    if (reversible()) {
      if (op) self.operator = op
      const tmp = self.left
      self.left = self.right
      self.right = tmp
    }
  }
  if (comp.options['lhs_constants'] && commutative_operators.has(self.operator)) {
    if (self.right.is_constant() && !self.left.is_constant()) {
      if (!(self.left instanceof ast_binary && precedence[self.left.operator] >= precedence[self.operator])) reverse()
    }
  }
  self = self.lift_sequences(comp)
  let strict_comparison
  if (comp.options['comparisons']) switch (self.operator) {
    case '===':
    case '!==':
      strict_comparison = true
      if ((self.left.is_string(comp) && self.right.is_string(comp)) || (self.left.is_number(comp) && self.right.is_number(comp))
        || (self.left.is_boolean() && self.right.is_boolean()) || self.left.equivalent_to(self.right)) {
        self.operator = self.operator.substr(0, 2)
      }
    case '==':
    case '!=':
      if (!strict_comparison && is_undefined(self.left, comp)) {
        self.left = make_node(ast_null, self.left)
      } else if (!strict_comparison && is_undefined(self.right, comp)) {
        self.right = make_node(ast_null, self.right)
      } else if (comp.options['typeofs'] && self.left instanceof ast_string && self.left.value == 'undefined'
        && self.right instanceof ast_unary_prefix && self.right.operator == 'typeof') {
        const expr = self.right.expr
        if (expr instanceof ast_symbol_ref ? expr.is_declared(comp) : true) {
          self.right = expr
          self.left = make_node(ast_undefined, self.left).optimize(comp)
          if (self.operator.length == 2) self.operator += '='
        }
      } else if (comp.options['typeofs'] && self.left instanceof ast_unary_prefix && self.left.operator == 'typeof'
        && self.right instanceof ast_string && self.right.value == 'undefined') {
        const expr = self.left.expr
        if (expr instanceof ast_symbol_ref ? expr.is_declared(comp) : true) {
          self.left = expr
          self.right = make_node(ast_undefined, self.right).optimize(comp)
          if (self.operator.length == 2) self.operator += '='
        }
      } else if (self.left instanceof ast_symbol_ref && self.right instanceof ast_symbol_ref
        && self.left.defined() === self.right.defined() && is_object(self.left.fixed_value())) {
        return make_node(self.operator[0] == '=' ? ast_true : ast_false, self)
      } else if (self.left.is_32_bit_integer() && self.right.is_32_bit_integer()) {
        const not = root => make_node(ast_unary_prefix, root, {operator: '!', expr: root})
        const booleanify = (root, truthy) => truthy ? comp.in_boolean_context() ? root : not(not(root)) : not(root)
        if (self.left instanceof ast_number && self.left.value === 0) return booleanify(self.right, self.operator[0] == '!')
        if (self.right instanceof ast_number && self.right.value === 0) return booleanify(self.left, self.operator[0] == '!')
        let and_op, x, mask
        if ((and_op = self.left instanceof ast_binary ? self.left : self.right instanceof ast_binary ? self.right : null)
          && (mask = and_op === self.left ? self.right : self.left) && and_op.operator == '&' && mask instanceof ast_number && mask.is_32_bit_integer()
          && (x = and_op.left.equivalent_to(mask) ? and_op.right : and_op.right.equivalent_to(mask) ? and_op.left : null)) {
          let optimized = booleanify(make_node(ast_binary, self, {operator: '&', left: mask,
            right: make_node(ast_unary_prefix, self, {operator: '~', expr: x})
          }), self.operator[0] == '!')
          return best_of(comp, optimized, self)
        }
      }
      break
    case '&&':
    case '||':
      let lhs = self.left
      if (lhs.operator == self.operator) lhs = lhs.right
      if (lhs instanceof ast_binary && lhs.operator == (self.operator == '&&' ? '!==' : '===') && self.right instanceof ast_binary
        && lhs.operator == self.right.operator && (is_undefined(lhs.left, comp) && self.right.left instanceof ast_null
          || lhs.left instanceof ast_null && is_undefined(self.right.left, comp))
        && !lhs.right.has_side_effects(comp) && lhs.right.equivalent_to(self.right.right)) {
        let right = make_node(ast_binary, self, {operator: lhs.operator.slice(0, -1), left: make_node(ast_null, self), right: lhs.right})
        if (lhs !== self.left) right = make_node(ast_binary, self, {operator: self.operator, left: self.left.left, right})
        return right
      }
      break
    }
    if (self.operator == '+' && comp.in_boolean_context()) {
      let ll = self.left.evaluate(comp)
      let rr = self.right.evaluate(comp)
      if (ll && typeof ll == 'string') return make_sequence(self, [self.right, make_node(ast_true, self)]).optimize(comp)
      if (rr && typeof rr == 'string') return make_sequence(self, [self.left, make_node(ast_true, self)]).optimize(comp)
    }
    if (comp.options['comparisons'] && self.is_boolean()) {
      if (!(comp.parent() instanceof ast_binary) || comp.parent() instanceof ast_assign) {
        const negated = make_node(ast_unary_prefix, self, {operator: '!', expr: self.negate(comp, first_in_statement(comp))})
        self = best_of(comp, self, negated)
      }
    }
    if (self.operator == '+') {
      if (self.right instanceof ast_string && self.right.getValue() == '' && self.left.is_string(comp)) return self.left
      if (self.left instanceof ast_string && self.left.getValue() == '' && self.right.is_string(comp)) return self.right
      if (self.left instanceof ast_binary && self.left.operator == '+' && self.left.left instanceof ast_string
        && self.left.left.getValue() == '' && self.right.is_string(comp)) {
        self.left = self.left.right
        return self
      }
  }
  if ('evaluate') {
    let ll, rr
    switch (self.operator) {
      case '&&':
        ll = has_flag(self.left, true_flag) ? true : has_flag(self.left, false_flag) ? false : self.left.evaluate(comp)
        if (!ll) {
          return maintain_bind(comp.parent(), comp.self(), self.left).optimize(comp)
        } else if (!(ll instanceof tree)) {
          return make_sequence(self, [ self.left, self.right ]).optimize(comp)
        }
        rr = self.right.evaluate(comp)
        if (!rr) {
          if (comp.in_boolean_context()) {
            return make_sequence(self, [self.left, make_node(ast_false, self)]).optimize(comp)
          } else {
            set_flag(self, false_flag)
          }
        } else if (!(rr instanceof tree)) {
          const parent = comp.parent()
          if (parent.operator == '&&' && parent.left === comp.self() || comp.in_boolean_context()) {
            return self.left.optimize(comp)
          }
        }
        if (self.left.operator == '||') {
          const lr = self.left.right.evaluate(comp)
          if (!lr) return make_node(ast_conditional, self, {
            condition: self.left.left,
            consequent: self.right,
            alt: self.left.right
          }).optimize(comp)
        }
        break
      case '||':
        ll = has_flag(self.left, true_flag) ? true : has_flag(self.left, false_flag) ? false : self.left.evaluate(comp)
        if (!ll) {
          return make_sequence(self, [ self.left, self.right ]).optimize(comp)
        } else if (!(ll instanceof tree)) {
          return maintain_bind(comp.parent(), comp.self(), self.left).optimize(comp)
        }
        rr = self.right.evaluate(comp)
        if (!rr) {
          const parent = comp.parent()
          if (parent.operator == '||' && parent.left === comp.self() || comp.in_boolean_context()) {
            return self.left.optimize(comp)
          }
        } else if (!(rr instanceof tree)) {
          if (comp.in_boolean_context()) {
            return make_sequence(self, [self.left, make_node(ast_true, self)]).optimize(comp)
          } else {
            set_flag(self, true_flag)
          }
        }
        if (self.left.operator == '&&') {
          const lr = self.left.right.evaluate(comp)
          if (lr && !(lr instanceof tree)) {
            return make_node(ast_conditional, self, {condition: self.left.left, consequent: self.left.right, alt: self.right}).optimize(comp)
          }
        }
        break
      case '??':
        if (is_nullish(self.left, comp)) return self.right
        ll = self.left.evaluate(comp)
        if (!(ll instanceof tree)) return ll == null ? self.right : self.left
        if (comp.in_boolean_context()) {
          rr = self.right.evaluate(comp)
          if (!(rr instanceof tree) && !rr) return self.left
        }
    }
    let associative = true
    switch (self.operator) {
      case '+':
        if (self.right instanceof ast_literal && self.left instanceof ast_binary && self.left.operator == '+' && self.left.is_string(comp)) {
          const binary = make_node(ast_binary, self, {operator: '+', left: self.left.right, right: self.right})
          const r = binary.optimize(comp)
          if (binary !== r) self = make_node(ast_binary, self, {operator: '+', left: self.left.left, right: r})
        }
        if (self.left instanceof ast_binary && self.left.operator == '+' && self.left.is_string(comp) && self.right instanceof ast_binary
          && self.right.operator == '+' && self.right.is_string(comp)) {
          const binary = make_node(ast_binary, self, {operator: '+', left: self.left.right, right: self.right.left})
          const m = binary.optimize(comp)
          if (binary !== m) {
            self = make_node(ast_binary, self, {
              operator: '+',
              left: make_node(ast_binary, self.left, {operator: '+', left: self.left.left, right: m}),
              right: self.right.right
            })
          }
        }
        if (self.right instanceof ast_unary_prefix && self.right.operator == '-' && self.left.is_number(comp)) {
          self = make_node(ast_binary, self, {operator: '-', left: self.left, right: self.right.expr})
          break
        }
        if (self.left instanceof ast_unary_prefix && self.left.operator == '-' && reversible() && self.right.is_number(comp)) {
          self = make_node(ast_binary, self, {operator: '-', left: self.right, right: self.left.expr})
          break
        }
        if (self.left instanceof ast_template_string) {
          const l = self.left, r = self.right.evaluate(comp)
          if (r != self.right) {
            l.segments[l.segments.length - 1].value += String(r)
            return l
          }
        }
        if (self.right instanceof ast_template_string) {
          const r = self.right, l = self.left.evaluate(comp)
          if (l != self.left) {
            r.segments[0].value = String(l) + r.segments[0].value
            return r
          }
        }
        if (self.left instanceof ast_template_string && self.right instanceof ast_template_string) {
          const l = self.left, r = self.right
          const segments = l.segments
          segments[segments.length - 1].value += r.segments[0].value
          for (let i = 1; i < r.segments.length; i++) {
            segments.push(r.segments[i])
          }
          return l
        }
      case '*':
        associative = false
      case '&':
      case '|':
      case '^':
        if (self.left.is_number(comp) && self.right.is_number(comp) && reversible() && !(self.left instanceof ast_binary
          && self.left.operator != self.operator  && precedence[self.left.operator] >= precedence[self.operator])) {
          const reversed = make_node(ast_binary, self, {operator: self.operator, left: self.right, right: self.left})
          if (self.right instanceof ast_literal && !(self.left instanceof ast_literal)) {
            self = best_of(comp, reversed, self)
          } else {
            self = best_of(comp, self, reversed)
          }
        }
        if (associative && self.is_number(comp)) {
          if (self.right instanceof ast_binary && self.right.operator == self.operator) {
            self = make_node(ast_binary, self, {operator: self.operator,
              left: make_node(ast_binary, self.left, {operator: self.operator, left: self.left, right: self.right.left,
                start: self.left.start, end: self.right.left.end, file: self.file}), right: self.right.right})
          }
          if (self.right instanceof ast_literal && self.left instanceof ast_binary && self.left.operator == self.operator) {
            if (self.left.left instanceof ast_literal) {
              self = make_node(ast_binary, self, {operator: self.operator,
                left: make_node(ast_binary, self.left, {operator: self.operator, left: self.left.left, right: self.right,
                  start: self.left.left.start, end: self.right.end, file: self.file}), right: self.left.right})
            } else if (self.left.right instanceof ast_literal) {
              self = make_node(ast_binary, self, {
                operator: self.operator,
                left: make_node(ast_binary, self.left, {
                  operator: self.operator,
                  left: self.left.right,
                  right: self.right,
                  start: self.left.right.start,
                  end: self.right.end,
                  file: self.file,
                }),
                right: self.left.left
              })
            }
          }
          if (self.left instanceof ast_binary && self.left.operator == self.operator && self.left.right instanceof ast_literal
            && self.right instanceof ast_binary && self.right.operator == self.operator && self.right.left instanceof ast_literal) {
            self = make_node(ast_binary, self, {operator: self.operator,
              left: make_node(ast_binary, self.left, {operator: self.operator,
                left: make_node(ast_binary, self.left.left, {
                  operator: self.operator,
                  left: self.left.right,
                  right: self.right.left,
                  start: self.left.right.start,
                  end: self.right.left.end,
                  file: self.file,
                }),
                right: self.left.left
              }),
              right: self.right.right
            })
          }
        }
    }
    if (bitwise_binop.has(self.operator)) {
      let y, z, x_node, y_node, z_node = self.left
      const right = self.right
      if (self.operator == '&' && right instanceof ast_binary && right.operator == '|'
        && typeof (z = self.left.evaluate(comp)) == 'number') {
        if (typeof (y = right.right.evaluate(comp)) == 'number') {
          x_node = right.left
          y_node = right.right
        } else if (typeof (y = right.left.evaluate(comp)) == 'number') {
          x_node = right.right
          y_node = right.left
        }
        if (x_node && y_node) {
          if ((y & z) === 0) {
            self = make_node(ast_binary, self, {
              operator: self.operator,
              left: z_node,
              right: x_node
            })
          } else {
            const reordered_ops = make_node(ast_binary, self, {
              operator: '|',
              left: make_node(ast_binary, self, {
                operator: '&',
                left: x_node,
                right: z_node
              }),
              right: make_node_from_constant(y & z, y_node),
            })

            self = best_of(comp, self, reordered_ops)
          }
        }
      }
      const same_operands = self.left.equivalent_to(right) && !self.left.has_side_effects(comp)
      if (same_operands) {
        if (self.operator == '^') return make_node(ast_number, self, {value: 0})
        if (self.operator == '|' || self.operator == '&') {
          self.left = make_node(ast_number, self, {value: 0})
          self.operator = '|'
        }
      }
      if ((self.operator == '<<' || self.operator == '>>') && right instanceof ast_number && right.value === 0) self.operator = '|'
      const zero_side = self.right instanceof ast_number && self.right.value === 0 ? self.right
        : self.left instanceof ast_number && self.left.value === 0 ? self.left : null
      const non_zero_side = zero_side && (zero_side === self.right ? self.left : self.right)
      if (zero_side && (self.operator == '|' || self.operator == '^')
        && (non_zero_side.is_32_bit_integer() || comp.in_32_bit_context())) return non_zero_side
      if (zero_side && self.operator == '&' && !non_zero_side.has_side_effects(comp)) return zero_side
      const is_full_mask = (root) => root instanceof ast_number && root.value === -1 || root instanceof ast_unary_prefix
        && (root.operator == '-' && root.expr instanceof ast_number && root.expr.value === 1 || root.operator == '~'
          && root.expr instanceof ast_number && root.expr.value === 0)
      const full_mask = is_full_mask(self.right) ? self.right : is_full_mask(self.left) ? self.left : null
      const non_full_mask = full_mask && (full_mask === self.right ? self.left : self.right)
      switch (self.operator) {
        case '|':
          if (full_mask && !non_full_mask.has_side_effects(comp)) return full_mask
          break
        case '&':
          if (full_mask && (non_full_mask.is_32_bit_integer() || comp.in_32_bit_context())) return non_full_mask
          break
        case '^':
          if (full_mask) return non_full_mask.bitwise_negate(comp.in_32_bit_context())
          if (self.left instanceof ast_unary_prefix && self.left.operator == '~'
            && self.right instanceof ast_unary_prefix && self.right.operator == '~') {
            self = make_node(ast_binary, self, {operator: '^', left: self.left.expr, right: self.right.expr})
          }
          break
      }
    }
  }
  if (self.right instanceof ast_binary && self.right.operator == self.operator && (lazy_op.has(self.operator)
    || (self.operator == '+' && (self.right.left.is_string(comp)
    || (self.left.is_string(comp) && self.right.right.is_string(comp)))))) {
    self.left = make_node(ast_binary, self.left, {
      operator: self.operator,
      left: self.left.transform(comp),
      right: self.right.left.transform(comp)
    })
    self.right = self.right.right.transform(comp)
    return self.transform(comp)
  }
  let ev = self.evaluate(comp)
  if (ev !== self) {
    ev = make_node_from_constant(ev, self).optimize(comp)
    return best_of(comp, ev, self)
  }
  return self
})

def_optimize(ast_symbol_export, function (self) { return self })

def_optimize(ast_symbol_ref, function (self, comp) {
  if (is_undeclared_ref(self) && !comp.find_parent(ast_with)) {
    switch (self.name) {
      case 'undefined': return make_node(ast_undefined, self).optimize(comp)
      case 'NaN': return make_node(ast_nan, self).optimize(comp)
      case 'Infinity': return make_node(ast_infinity, self).optimize(comp)
    }
  }
  return comp.options['reduce_vars'] && !comp.is_lhs() ? inline_into_symbolref(self, comp) : self
})

function is_atomic(lhs, self) { return lhs instanceof ast_symbol_ref || lhs.type === self.type }

def_optimize(ast_undefined, function (self, comp) {
  const lhs = comp.is_lhs()
  if (lhs && is_atomic(lhs, self)) return self
  return make_node(ast_unary_prefix, self, {operator: 'void',
    expr: make_node(ast_number, self, {value: 0})
  })
})

def_optimize(ast_infinity, function (self, comp) {
  const lhs = comp.is_lhs()
  if (lhs && is_atomic(lhs, self)) return self
  if (comp.options['keep_infinity'] && !(lhs && !is_atomic(lhs, self)) && !find_variable(comp, 'Infinity')) {
    return self
  }
  return make_node(ast_binary, self, {operator: '/',
    left: make_node(ast_number, self, {value: 1}),
    right: make_node(ast_number, self, {value: 0})
  })
})

def_optimize(ast_nan, function (self, comp) {
  const lhs = comp.is_lhs()
  if (lhs && !is_atomic(lhs, self) || find_variable(comp, 'NaN')) {
    return make_node(ast_binary, self, {operator: '/',
      left: make_node(ast_number, self, {value: 0}),
      right: make_node(ast_number, self, {value: 0})
    })
  }
  return self
})

const assign_ops = make_set('+ - / * % >> << >>> | ^ &')
const assign_ops_commutative = make_set('* | ^ &')

def_optimize(ast_assign, function (self, comp) {
  if (self.logical) return self.lift_sequences(comp)
  let defined
  if (self.operator == '=' && self.left instanceof ast_symbol_ref && self.left.name !== 'arguments'
    && !(defined = self.left.defined()).undeclared && self.right.equivalent_to(self.left)) {
    return self.right
  }
  if (comp.options['dead_code'] && self.left instanceof ast_symbol_ref
    && (defined = self.left.defined()).scope === comp.find_parent(ast_lambda)) {
    let level = 0, parent = self, root
    do {
      root = parent
      parent = comp.parent(level++)
      if (parent instanceof ast_exit) {
        if (in_try(level, parent)) break
        if (is_reachable(defined.scope, [ defined ])) break
        if (self.operator == '=') return self.right
        defined.fixed = false
        return make_node(ast_binary, self, {
          operator: self.operator.slice(0, -1),
          left: self.left,
          right: self.right
        }).optimize(comp)
      }
    } while (parent instanceof ast_binary && parent.right === root || parent instanceof ast_sequence && parent.tail_node() === root)
  }
  self = self.lift_sequences(comp)
  if (self.operator == '=' && self.left instanceof ast_symbol_ref && self.right instanceof ast_binary) {
    if (self.right.left instanceof ast_symbol_ref && self.right.left.name == self.left.name && assign_ops.has(self.right.operator)) {
      self.operator = self.right.operator + '='
      self.right = self.right.right
    } else if (self.right.right instanceof ast_symbol_ref && self.right.right.name == self.left.name
      && assign_ops_commutative.has(self.right.operator) && !self.right.left.has_side_effects(comp)) {
      self.operator = self.right.operator + '='
      self.right = self.right.left
    }
  }
  return self

  function in_try (level, root) {
    function may_assignment_throw () {
      const right = self.right
      self.right = make_node(ast_null, right)
      const may_throw = root.may_throw(comp)
      self.right = right
      return may_throw
    }
    const stop_at = self.left.defined().scope.get_defun_scope()
    let parent
    while ((parent = comp.parent(level++)) !== stop_at) {
      if (parent instanceof ast_try) {
        if (parent.bfinally) return true
        if (parent.bcatch && may_assignment_throw()) return true
      }
    }
  }
})

def_optimize(ast_default_assign, function (self, comp) {
  let right = self.right.evaluate(comp), lambda, iife
  if (right === undefined) {
    if ((lambda = comp.parent()) instanceof ast_lambda ? (comp.options['keep_fargs'] === false
        || (iife = comp.parent(1)).type == 'ast_call' && iife.expr === lambda) : true) {
      self = self.left
    }
  } else if (right !== self.right) {
    right = make_node_from_constant(right, self.right)
    self.right = best_of_expression(right, self.right)
  }
  return self
})

function is_nullish_check (check, check_subject, comp) {
  if (check_subject.may_throw(comp)) return false
  let nullish_side
  if (check instanceof ast_binary && check.operator == '=='
    && ((nullish_side = is_nullish(check.left, comp) && check.left)  || (nullish_side = is_nullish(check.right, comp) && check.right))
    && (nullish_side === check.left ? check.right : check.left).equivalent_to(check_subject)) {
    return true
  }
  if (check instanceof ast_binary && check.operator == '||') {
    let null_cmp
    let undefined_cmp
    function find_comparison (cmp) {
      if (!(cmp instanceof ast_binary && (cmp.operator == '===' || cmp.operator == '=='))) return false
      let found = 0
      let defined_side
      if (cmp.left instanceof ast_null) {
        found++
        null_cmp = cmp
        defined_side = cmp.right
      }
      if (cmp.right instanceof ast_null) {
        found++
        null_cmp = cmp
        defined_side = cmp.left
      }
      if (is_undefined(cmp.left, comp)) {
        found++
        undefined_cmp = cmp
        defined_side = cmp.right
      }
      if (is_undefined(cmp.right, comp)) {
        found++
        undefined_cmp = cmp
        defined_side = cmp.left
      }
      if (found !== 1) return false
      if (!defined_side.equivalent_to(check_subject)) return false
      return true
    }
    if (!find_comparison(check.left)) return false
    if (!find_comparison(check.right)) return false
    if (null_cmp && undefined_cmp && null_cmp !== undefined_cmp) return true
  }
  return false
}

def_optimize(ast_conditional, function (self, comp) {
  if (!comp.options['conditionals']) return self
  if (self.condition instanceof ast_sequence) {
    const expressions = self.condition.expressions.slice()
    self.condition = expressions.pop()
    expressions.push(self)
    return make_sequence(self, expressions)
  }
  const cond = self.condition.evaluate(comp)
  if (cond !== self.condition) return maintain_bind(comp.parent(), comp.self(), cond ? self.consequent : self.alt)
  const negated = cond.negate(comp, first_in_statement(comp))
  if (best_of(comp, cond, negated) === negated) {
    self = make_node(ast_conditional, self, {condition: negated, consequent: self.alt, alt: self.consequent})
  }
  const condition = self.condition, consequent = self.consequent, alt = self.alt
  if (condition instanceof ast_symbol_ref && consequent instanceof ast_symbol_ref && condition.defined() === consequent.defined()) {
    return make_node(ast_binary, self, {operator: '||', left: condition, right: alt})
  }
  if (consequent instanceof ast_assign && alt instanceof ast_assign && consequent.operator === alt.operator
    && consequent.logical === alt.logical && consequent.left.equivalent_to(alt.left)
    && (!self.condition.has_side_effects(comp) || consequent.operator == '=' && !consequent.left.has_side_effects(comp))) {
    return make_node(ast_assign, self, {
      operator: consequent.operator,
      left: consequent.left,
      logical: consequent.logical,
      right: make_node(ast_conditional, self, {condition: self.condition, consequent: consequent.right, alt: alt.right})
    })
  }
  let arg_index
  if (consequent instanceof ast_call && alt.type === consequent.type && consequent.args.length > 0
    && consequent.args.length == alt.args.length && consequent.expr.equivalent_to(alt.expr)
    && !self.condition.has_side_effects(comp) && !consequent.expr.has_side_effects(comp) && typeof (arg_index = single_arg_diff()) == 'number') {
    const root = consequent.copy()
    root.args[arg_index] = make_node(ast_conditional, self, {condition: self.condition, consequent: consequent.args[arg_index], alt: alt.args[arg_index] })
    return root
  }
  if (alt instanceof ast_conditional && consequent.equivalent_to(alt.consequent)) {
    return make_node(ast_conditional, self, {
      condition: make_node(ast_binary, self, {operator: '||', left: condition, right: alt.condition}),
      consequent: consequent,
      alt: alt.alt
    }).optimize(comp)
  }
  if (is_nullish_check(condition, alt, comp)) {
    return make_node(ast_binary, self, {operator: '??', left: alt, right: consequent}).optimize(comp)
  }
  if (alt instanceof ast_sequence && consequent.equivalent_to(alt.expressions[alt.expressions.length - 1])) {
    return make_sequence(self, [
      make_node(ast_binary, self, {operator: '||', left: condition, right: make_sequence(self, alt.expressions.slice(0, -1)) }),
      consequent
    ]).optimize(comp)
  }
  if (alt instanceof ast_binary && alt.operator == '&&' && consequent.equivalent_to(alt.right)) {
    return make_node(ast_binary, self, {operator: '&&',
      left: make_node(ast_binary, self, {operator: '||', left: condition, right: alt.left}),
      right: consequent
    }).optimize(comp)
  }
  if (consequent instanceof ast_conditional && consequent.alt.equivalent_to(alt)) {
    return make_node(ast_conditional, self, {
      condition: make_node(ast_binary, self, {left: self.condition, operator: '&&', right: consequent.condition}),
      consequent: consequent.consequent,
      alt: alt
    })
  }
  if (consequent.equivalent_to(alt)) {
    return make_sequence(self, [ self.condition, consequent ]).optimize(comp)
  }
  if (consequent instanceof ast_binary && consequent.operator == '||' && consequent.right.equivalent_to(alt)) {
    return make_node(ast_binary, self, {operator: '||',
      left: make_node(ast_binary, self, {operator: '&&', left: self.condition, right: consequent.left  }),
      right: alt
    }).optimize(comp)
  }

  const in_bool = comp.in_boolean_context()

  function is_true (root) {
    return root instanceof ast_true || in_bool && root instanceof ast_literal && root.getValue()
      || (root instanceof ast_unary_prefix && root.operator == '!' && root.expr instanceof ast_literal && !root.expr.getValue())
  }

  function is_false (root) {
    return root instanceof ast_false || in_bool && root instanceof ast_literal && !root.getValue()
      || (root instanceof ast_unary_prefix && root.operator == '!' && root.expr instanceof ast_literal && root.expr.getValue())
  }

  function single_arg_diff () {
    const args1 = consequent.args, args2 = alt.args
    let i = 0, len = args1.length, j
    for (; i < len; i++) {
      if (args1[i] instanceof ast_spread) return
      if (!args1[i].equivalent_to(args2[i])) {
        if (args2[i] instanceof ast_spread) return
        for (j = i + 1; j < len; j++) {
          if (args1[j] instanceof ast_spread) return
          if (!args1[j].equivalent_to(args2[j])) return
        }
        return i
      }
    }
  }

  function booleanize (root) {
    if (root.is_boolean()) return root
    return make_node(ast_unary_prefix, root, {operator: '!', expr: root.negate(comp) })
  }

  if (is_true(self.consequent)) {
    if (is_false(self.alt)) return booleanize(self.condition)
    return make_node(ast_binary, self, {operator: '||', left: booleanize(self.condition), right: self.alt})
  }
  if (is_false(self.consequent)) {
    if (is_true(self.alt)) return booleanize(self.condition.negate(comp))
    return make_node(ast_binary, self, {operator: '&&', left: booleanize(self.condition.negate(comp)), right: self.alt})
  }
  if (is_true(self.alt)) {
    return make_node(ast_binary, self, {operator: '||', left: booleanize(self.condition.negate(comp)), right: self.consequent})
  }
  if (is_false(self.alt)) {
    return make_node(ast_binary, self, {operator: '&&', left: booleanize(self.condition), right: self.consequent})
  }
  return self
})

function optimize_template (self) {
  let i, len, raw, reducable, index
  for (i = 0, len = self.segments.length; i < len; i++) {
    if (self.segments[i] instanceof ast_template_segment) {
      raw = self.segments[i].raw
      reducable = true
      while (reducable) {
        if (raw.indexOf('>\n') > -1) {
          index = raw.indexOf('>\n')
          raw = raw.slice(0, index + 1) + raw.slice(index + 2)
        } else if (raw.indexOf('> ') > -1) {
          index = raw.indexOf('> ')
          raw = raw.slice(0, index + 1) + raw.slice(index + 2)
        } else if (raw.indexOf(' <') > -1) {
          index = raw.indexOf(' <')
          raw = raw.slice(0, index) + raw.slice(index + 1)
        } else if (raw.indexOf('\n<') > -1) {
          index = raw.indexOf('\n<')
          raw = raw.slice(0, index) + raw.slice(index + 1)
        } else if (raw.indexOf('  ') > -1) {
          index = raw.indexOf('  ')
          raw = raw.slice(0, index) + raw.slice(index + 1)
        } else if (raw.indexOf('\n ') > -1) {
          index = raw.indexOf('\n ')
          raw = raw.slice(0, index) + raw.slice(index + 1)
        } else if (raw.indexOf(' \n') > -1) {
          index = raw.indexOf(' \n')
          raw = raw.slice(0, index) + raw.slice(index + 1)
        } else if (raw.indexOf('\n') === 0) {
          raw = raw.slice(1)
        } else if (raw.endsWith('\n')) {
          raw = raw.slice(0, -1)
        } else {
          reducable = false
        }
      }
      self.segments[i].raw = raw
    }
  }
  return self
}

def_optimize(ast_template_string, function (self, comp) {
  if (comp.parent() instanceof ast_prefixed_template) return optimize_template(self)
  const segments = []
  let segment, result, inners, i, len1, j, len2
  for (i = 0, len1 = self.segments.length; i < len1; i++) {
    segment = self.segments[i]
    if (segment instanceof tree) {
      result = segment.evaluate(comp)
      if (result !== segment && (result + '').length <= segment.size() + '${}'.length) {
        segments[segments.length - 1].value = segments[segments.length - 1].value + result + self.segments[++i].value
        continue
      }
      if (segment instanceof ast_template_string) {
        inners = segment.segments
        segments[segments.length - 1].value += inners[0].value
        for (j = 1, len2 = inners.length; j < len2; j++) {
          segment = inners[j]
          segments.push(segment)
        }
        continue
      }
    }
    segments.push(segment)
  }
  self.segments = segments
  if (segments.length == 1) return make_node(ast_string, self, segments[0])
  if (segments.length === 3 && segments[1] instanceof tree
    && (segments[1].is_string(comp) || segments[1].is_number(comp) || is_nullish(segments[1], comp))) {
    if (segments[2].value == '') {
      return make_node(ast_binary, self, {operator: '+',
        left: make_node(ast_string, self, {value: segments[0].value}),
        right: segments[1],
      })
    }
    if (segments[0].value == '') {
      return make_node(ast_binary, self, {operator: '+', left: segments[1],
        right: make_node(ast_string, self, {value: segments[2].value}),
      })
    }
  }
  return self
})

def_optimize(ast_prefixed_template, function (self) { return self })

function safe_to_flatten (value, comp) {
  if (value instanceof ast_symbol_ref) value = value.fixed_value()
  if (!value) return false
  if (!(value instanceof ast_lambda || value instanceof ast_class)) return true
  if (!(value instanceof ast_lambda && value.this())) return true
  return comp.parent() instanceof ast_new
}

ast_prop_access.prototype.flatten_object = function (key, comp) {
  if (!comp.options['properties']) return
  if (key == '__proto__') return
  const expr = this.expr
  if (expr instanceof ast_object) {
    const props = expr.properties
    let prop, v
    for (let i = props.length; --i >= 0;) {
      prop = props[i]
      if ('' + (prop instanceof ast_concise_method ? prop.key.name : prop.key) == key) {
        const all_props_flattenable = props.every((p) => (p instanceof ast_key_value || p instanceof ast_concise_method && !p.gen) && !p.computed_key())
        if (!all_props_flattenable) return
        if (!safe_to_flatten(prop.value, comp)) return
        return make_node(ast_sub, this, {
          expr: make_node(ast_array, expr, {
            elements: props.map(function (prop) {
              v = prop.value
              if (v instanceof ast_accessor) v = make_node(ast_function, v, v)
              k = prop.key
              if (k instanceof tree && !(k instanceof ast_symbol_method)) return make_sequence(prop, [ k, v ])
              return v
            })
          }),
          property: make_node(ast_number, this, {value: i})
        })
      }
    }
  }
}

def_optimize(ast_sub, function (self, comp) {
  const expr = self.expr
  let prop = self.property, key, value, property, i
  if (comp.options['properties']) {
    key = prop.evaluate(comp)
    if (key !== prop) {
      if (typeof key == 'string') {
        if (key == 'undefined') {
          key = undefined
        } else {
          value = parseFloat(key)
          if (value.toString() == key) key = value
        }
      }
      prop = self.property = best_of_expression(prop, make_node_from_constant(key, prop).transform(comp))
      property = '' + key
      if (is_basic_identifier_string(property) && property.length <= prop.size() + 1) {
        return make_node(ast_dot, self, {expr, optional: self.optional, property: property, quote: prop.quote}).optimize(comp)
      }
    }
  }
  let fn
  opt_arguments: if (comp.options['arguments'] && expr instanceof ast_symbol_ref
    && expr.name == 'arguments' && expr.defined().orig.length == 1
    && (fn = expr.scope) instanceof ast_lambda && fn.uses_args
    && !(fn instanceof ast_arrow) && prop instanceof ast_number) {
    const index = prop.getValue(), params = new Set(), argnames = fn.argnames
    let param
    for (let n = 0; n < argnames.length; n++) {
      if (!(argnames[n] instanceof ast_symbol_funarg)) break opt_arguments
      param = argnames[n].name
      if (params.has(param)) break opt_arguments
      params.add(param)
    }
    let argname = fn.argnames[index]
    if (argname) {
      const defined = argname.defined()
      if (!comp.options['reduce_vars'] || defined.assignments || defined.orig.length > 1) argname = null
    } else if (!argname && !comp.options['keep_fargs'] && index < fn.argnames.length + 5) {
      while (index >= fn.argnames.length) {
        argname = fn.create_symbol(ast_symbol_funarg, {source: fn, scope: fn, tentative_name: 'arg_' + fn.argnames.length})
        fn.argnames.push(argname)
      }
    }
    if (argname) {
      const sym = make_node(ast_symbol_ref, self, argname)
      sym.reference({})
      clear_flag(argname, unused_flag)
      return sym
    }
  }
  if (comp.is_lhs()) return self
  if (key !== prop) {
    const sub = self.flatten_object(property, comp)
    if (sub) {
      expr = self.expr = sub.expr
      prop = self.property = sub.property
    }
  }
  if (comp.options['properties'] && comp.options['side_effects'] && prop instanceof ast_number && expr instanceof ast_array) {
    const elements = expr.elements
    let index = prop.getValue(), result = elements[index]
    safe_flatten: if (safe_to_flatten(result, comp)) {
      const values = []
      let safe_flatten = true
      for (i = elements.length; --i > index;) {
        value = elements[i].drop(comp)
        if (value) {
          values.unshift(value)
          if (safe_flatten && value.has_side_effects(comp)) safe_flatten = false
        }
      }
      if (result instanceof ast_spread) break safe_flatten
      result = result instanceof ast_hole ? make_node(ast_undefined, result) : result
      if (!safe_flatten) values.unshift(result)
      while (--i >= 0) {
        value = elements[i]
        if (value instanceof ast_spread) break safe_flatten
        value = value.drop(comp)
        value ? values.unshift(value) : index--
      }
      if (safe_flatten) {
        values.push(result)
        return make_sequence(self, values).optimize(comp)
      } else {
        return make_node(ast_sub, self, {
          expr: make_node(ast_array, expr, {elements: values}),
          property: make_node(ast_number, prop, {value: index})
        })
      }
    }
  }
  let ev = self.evaluate(comp)
  if (ev !== self) {
    ev = make_node_from_constant(ev, self).optimize(comp)
    return best_of(comp, ev, self)
  }
  return self
})

def_optimize(ast_chain, function (self, comp) {
  if (is_nullish(self.expr, comp)) {
    let parent = comp.parent()
    if (parent instanceof ast_unary_prefix && parent.operator == 'delete') return make_node_from_constant(0, self)
    return make_node(ast_undefined, self)
  }
  return self
})

def_optimize(ast_dot, function (self, comp) {
  const parent = comp.parent()
  if (comp.is_lhs()) return self
  if (!(parent instanceof ast_call) || !has_annotation(parent, _noinline)) {
    const sub = self.flatten_object(self.property, comp)
    if (sub) return sub.optimize(comp)
  }
  if (self.expr instanceof ast_prop_access && parent instanceof ast_prop_access) return self
  let ev = self.evaluate(comp)
  if (ev !== self) {
    ev = make_node_from_constant(ev, self).optimize(comp)
    return best_of(comp, ev, self)
  }
  return self
})

function literals_in_boolean_context (self, comp) {
  if (comp.in_boolean_context()) return best_of(comp, self, make_sequence(self, [ self, make_node(ast_true, self) ]).optimize(comp))
  return self
}

function inline_array_like_spread (elements) {
  let i, el, expr
  for (i = 0; i < elements.length; i++) {
    el = elements[i]
    if (el instanceof ast_spread) {
      expr = el.expr
      if (expr instanceof ast_array && !expr.elements.some(elm => elm instanceof ast_hole)) {
        elements.splice(i, 1, ...expr.elements)
        i--
      }
    }
  }
}

def_optimize(ast_array, function (self, comp) {
  const optimized = literals_in_boolean_context(self, comp)
  if (optimized !== self) return optimized
  inline_array_like_spread(self.elements)
  return self
})

function inline_object_prop_spread (props) {
  let i, prop
  for (i = 0; i < props.length; i++) {
    prop = props[i]
    if (prop instanceof ast_spread) {
      const expr = prop.expr
      if (expr instanceof ast_object && expr.properties.every(prop => prop instanceof ast_key_value)) {
        props.splice(i, 1, ...expr.properties)
        i--
      } else if (( expr instanceof ast_literal || expr.is_constant()) && !(expr instanceof ast_string)) {
        props.splice(i, 1)
        i--
      }
    }
  }
}

def_optimize(ast_object, function (self, comp) {
  const optimized = literals_in_boolean_context(self, comp)
  if (optimized !== self) return optimized
  inline_object_prop_spread(self.properties)
  return self
})

def_optimize(ast_reg_exp, literals_in_boolean_context)

def_optimize(ast_return, function (self, comp) {
  if (self.value && is_undefined(self.value, comp)) self.value = null
  return self
})

def_optimize(ast_arrow, opt_lambda)

def_optimize(ast_function, function (self, comp) {
  return opt_lambda(self, comp)
})

def_optimize(ast_class, function (self) {
  for (let i = 0; i < self.properties.length; i++) {
    const prop = self.properties[i]
    if (prop instanceof ast_class_static && prop.body.length == 0) {
      self.properties.splice(i, 1)
      i--
    }
  }
  return self
})

def_optimize(ast_class_static, function (self, comp) {
  tighten_body(self.body, comp)
  return self
})

def_optimize(ast_destructure, function (self, comp) {
  function is_destructure_export_decl (comp) {
    const ancestors = [/^VarDef$/, /^(Const|Let|Var)$/, /^Export$/]
    let parent
    for (let a = 0, p = 0, len = ancestors.length; a < len; p++) {
      parent = comp.parent(p)
      if (!parent) return false
      if (a === 0 && parent.type == 'ast_destructure') continue
      if (!ancestors[a].test(parent.type)) return false
      a++
    }
    return true
  }
  function should_retain (comp, defined) {
    if (defined.references.length) return true
    if (!defined.global) return false
    if (comp.toplevel.vars) {
      if (comp.top_retain) return comp.top_retain(defined)
      return false
    }
    return true
  }
  if (comp.options['pure_getters'] == true && comp.options['unused'] && !self.is_array
    && Array.isArray(self.names) && !is_destructure_export_decl(comp)
    && !(self.names[self.names.length - 1] instanceof ast_spread)) {
    const keep = []
    let elem
    for (let i = 0; i < self.names.length; i++) {
      elem = self.names[i]
      if (!(elem instanceof ast_key_value && typeof elem.key == 'string'
        && elem.value instanceof ast_declaration
        && !should_retain(comp, elem.value.defined()))) {
        keep.push(elem)
      }
    }
    if (keep.length != self.names.length) self.names = keep
  }
  return self
})

def_optimize(ast_yield, function (self, comp) {
  if (self.expr && !self.star && is_undefined(self.expr, comp)) self.expr = null
  return self
})

function lift_key (self, comp) {
  if (!comp.options['computed_props']) return self
  if (!(self.key instanceof ast_literal)) return self
  if (self.key instanceof ast_string || self.key instanceof ast_number) {
    const key = self.key.value.toString()
    if (key == '__proto__') return self
    if (key == 'constructor' && comp.parent() instanceof ast_class) return self
    if (self instanceof ast_key_value) {
      self.set_quote(self.key.quote)
      self.key = key
    } else if (self instanceof ast_class_property) {
      self.set_quote(self.key.quote)
      self.key = make_node(ast_symbol_class_property, self.key, {name: key})
    } else {
      self.set_quote(self.key.quote)
      self.key = make_node(ast_symbol_method, self.key, {name: key})
    }
  }
  return self
}

def_optimize(ast_concise_method, function (self, comp) {
  lift_key(self, comp)
  if (comp.options['arrows'] && comp.parent() instanceof ast_object && !self.gen && !self.value.uses_args && !self.value.pinned()
    && self.value.body.length == 1 && self.value.body[0] instanceof ast_return && self.value.body[0].value && !self.value.this()) {
    const arrow = make_node(ast_arrow, self.value, self.value)
    arrow.sync = self.sync
    arrow.gen = self.gen
    return make_node(ast_key_value, self, {key: self.key instanceof ast_symbol_method ? self.key.name : self.key,
      value: arrow, quote: self.quote})
  }
  return self
})

def_optimize(ast_key_value, function (self, comp) {
  lift_key(self, comp)
  return self
})

def_optimize(ast_object_property, lift_key)

function build (input, output, options={}) {
  options = defaults(options, {'compress': {}, 'format': {}, 'mangle': {}, 'module': false, 'parse': {}, 'toplevel': true})
  if (output.slice(-3) == '.js') output_js()
  options.parse.module = options.module
  options.compress.module = options.module
  options.compress.toplevel = options.toplevel
  options.mangle.module = options.module
  options.mangle.toplevel = options.toplevel
  options.mangle = defaults(options.mangle, {'eval': false, 'module': false, 'reserved': [] })
  options.parse.toplevel = new ast_toplevel()
  let imported = [], imports = [input], file, text
  while (imports.length) {
    file = imports[0]
    if (member(file, imported)) {
      imports.shift(1)
    } else {
      text = ''
      try { text = fs.readFileSync(file, 'utf-8') } catch (e) { text = '' }
      options.parse.toplevel.file = file
      options.parse.toplevel.imports = imports
      options.parse.toplevel.imported = imported
      options.parse.toplevel.pushed = true
      options.parse.toplevel = parse(text, options.parse)
      imports = options.parse.toplevel.imports
      if (options.parse.toplevel.pushed) imported.push(file)
    }
  }
  let toplevel = options.parse.toplevel
  options.mangle.imports = toplevel.imports
  toplevel = toplevel.wrap_enclose()
  toplevel = new Compressor(options.compress, {mangle_options: options.mangle}).compress(toplevel)
  toplevel.figure_out_scope(options.mangle)
  toplevel.compute_char_frequency(options.mangle)
  toplevel.mangle_names(options.mangle)
  toplevel = mangle_props(toplevel, options.mangle)
  const result = {}
  let formats, stream
  if (!('code' in options) || options.format.code) {
    formats = options.format
    stream = output_stream(formats)
    toplevel.print(stream)
    result.code = stream.get()
  }
  if (output && result.code) fs.writeFileSync(output, result.code)
  console.log('bundled', result)
}

let args = process.argv
build(args[2], args[3])