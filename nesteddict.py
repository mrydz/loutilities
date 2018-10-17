###########################################################################################
#   nesteddict - dotted[k1.k2.k3] into nested[k1][k2][k3]
#
#   Date        Author      Reason
#   ----        ------      ------
#   10/04/18    Lou King    create
#
#   Copyright 2018 Lou King
###########################################################################################

# standard
from copy import deepcopy

class parameterError(Exception): pass

#----------------------------------------------------------------------
def dotted2nested_set(d, key, value):
#----------------------------------------------------------------------
    '''
    if key is in dotted notation, turn into nested dict
    e.g., dotted['k1.k2.k3'] into nested['k1']['k2']['k3']
    '''
    keysplit = key.split('.')
    if len(keysplit) == 1:
        d[key] = value
    else:
        if keysplit[0] not in d:
            d[keysplit[0]] = {}
        dotted2nested_set(d[keysplit[0]], '.'.join(keysplit[1:]), value)

#----------------------------------------------------------------------
def dotted2nested_get(d, key):
#----------------------------------------------------------------------
    '''
    if key is in dotted notation, turn into nested dict
    e.g., dotted['k1.k2.k3'] into nested['k1']['k2']['k3']
    '''
    keysplit = key.split('.')
    if len(keysplit) == 1:
        return d[key]
    else:
        return dotted2nested_get(d[keysplit[0]], '.'.join(keysplit[1:]))

#----------------------------------------------------------------------
def nested2dotted_keys(d):
#----------------------------------------------------------------------
    keys = []

    for key in d:
        # need to drill down if we are at a dict-like object
        if isinstance(d[key], dict):
            keys += ['.'.join([key, subkey]) for subkey in nested2dotted_keys(d[key])]

        else:
            keys.append(key)

    return keys

#----------------------------------------------------------------------
def obj2dict(obj):
#----------------------------------------------------------------------
    # adapted from https://stackoverflow.com/questions/7963762/what-is-the-most-economical-way-to-convert-nested-python-objects-to-dictionaries
    if not  hasattr(obj,"__dict__"):
        return obj
    result = {}
    for key, val in obj.__dict__.items():
        if key.startswith("_"):
            continue
        element = []
        if isinstance(val, list):
            for item in val:
                element.append(obj2dict(item))
        else:
            element = obj2dict(val)
        result[key] = element
    return result

###########################################################################################
class NestedDict(dict):
###########################################################################################

    #----------------------------------------------------------------------
    def __init__(self, val={}):
    #----------------------------------------------------------------------
        self.set(val)

    #----------------------------------------------------------------------
    def __setitem__(self, key, val):
    #----------------------------------------------------------------------
        dotted2nested_set(self.val, key, val)

    #----------------------------------------------------------------------
    def __getitem__(self, key):
    #----------------------------------------------------------------------
        return dotted2nested_get(self.val, key)

    #----------------------------------------------------------------------
    def set(self, newval):
    #----------------------------------------------------------------------
        '''
        set val of class to supplied parameter

        if dict just copy
        convert object to dict
        raise error if not dict or object

        parameters:

        * newval - must be dict or obj, otherwise exception
        '''
        if isinstance(newval, dict):
            self.val = deepcopy(newval)

        elif hasattr(newval, '__dict__'):
            self.val = obj2dict(newval)

        else:
            raise parameterError, 'invalid parameter {}: newval must be dict or object'.format(newval)

    #----------------------------------------------------------------------
    def to_dict(self):
    #----------------------------------------------------------------------
        return self.val

    #----------------------------------------------------------------------
    def to_dotted(self):
    #----------------------------------------------------------------------
        dotted = {}

        for key in nested2dotted_keys(self.val):
            dotted[key] = dotted2nested_get(self.val, key)

        return dotted