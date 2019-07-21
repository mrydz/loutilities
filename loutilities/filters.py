###########################################################################################
#   filters - filters which work with tables-assets/static/filters.css
#
#       Date            Author          Reason
#       ----            ------          ------
#       06/30/19        Lou King        Create
#
#   Copyright 2019 Lou King.  All rights reserved
###########################################################################################
'''
filters - filters which work with tables-assets/static/filters.css

Usage::

    filters = filtercontainerdiv()
    filters.append(filterdiv('filter1-id', 'Filter 1 Label'))
    filters.append(filterdiv('filter2-id', 'Filter 2 Label'))

        :

    example = CrudApi(
            :
        pretablehtml = filters,
            :
    )
'''

from dominate.tags import div, span

def filterdiv(id, label):
    '''
    build div with spans for label, filter
    :param id:
    :param label:
    :return: dominate div
    '''
    return div(
        span(label, _class='label'),
        span(id=id, _class='filter'),
        _class='filter-item',
    )

def filtercontainerdiv():
    '''
    build div for filter container
    :return: dominate div
    '''
    return div(_class='external-filter filter-container')
