# for linux or mac

import sys


def func (self): pass
def return_none (self): return None
def return_self (self): return self
def return_true (self): return True
def return_false (self): return False

class tree:
    def __init__ (self, props={}):
        self.func('tree', ['a', 'z', 'f'], props)
def tfunc (self, ftype, args, props):
    self.type = ftype
    if len(props):
        for arg in args:
            self[arg] = props[arg]
setattr(tree, 'func', tfunc)
setattr(tree, 'ascend', func)
setattr(tree, 'branch', func)
def _copy (self, deep):
    if deep:
        this = self.copy()
        def return_root (root):
            if root != this:
                return root.copy(True)
        return self.transform(transforms(return_root))
    return self.__init__(self)
setattr(tree, '_copy', _copy)
def copy (self, deep):
    return self._copy(deep)
setattr(tree, 'copy', copy)
setattr(tree, 'equals', return_false)
def observe (self, observer):
    return observer.observe(self)
setattr(tree, 'observe', observe)
def transform (self, trees, trim):
    trees.append(self)
    transformed = None
    if trees.before:
        transformed = trees.before(self, self.ascend, trim)
    if transformed == None:
        transformed = self
        self.ascend(transformed, trees)
        if trees.after:
            after = trees.after(transformed, trim)
            if after:
                transformed = after
    trees.pop()
    return transformed
setattr(tree, 'transform', transform)

class menta (tree):
    def __init__ (self, props):
        super()
        self.func('menta', ['a', 'z', 'f'], props)



class observes:
    def __init__ (self, callback):
        self.callback = callback
        self.stack = []

    def observe (self, root, ascend):
        self.stack.append(root)



class transforms (observes):
    def __init__ (self, before, after):
        super()
        self.after = after
        self.before = before



def out (la):
    if la == 'js': setattr(tree, 'show', func)


def solve (file, folder):
    return '/'.join(file.split('/')[:-folder.index('/')]) + '/' + folder.split('./')[1]


def parse (opt, text):
    if False:
        of = solve(opt['of'], mod['value'])
        if of not in opt['om'] and of not in opt['oq']: opt['om'].append(of)

    return opt


def build (of, fo):
    out('js')
    opt = {'top': tree()}
    om = [of]
    oq = []

    while len(om):
        of = om[0]
        if of in oq:
            del om[0]
        else:
            try:
                with open(of, 'r') as file:
                    text = file.read()
            except:
                text = ''
            opt['of'] = of
            opt['om'] = om
            opt['oq'] = oq
            oq.append(of)
            opt = parse(opt, text)
            om = opt['om']

    output = opt['top'].show()
    if output:
        with open(fo, 'w') as file:
            file.write(output)

args = sys.argv
build(args[1], args[2])