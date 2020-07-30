/**
 * generic datatables child row handling
 */

/**
 * @typedef {Object<rowid, Object<tablename, ChildRowTableMeta>>} ChildRowMeta
 *
 * @typedef {Object} ChildRowTableMeta
 * @property {DataTable} table DataTable instance
 * @property {string} tableid css id for table
 * @property {Editor} [editor] Editor instance associated with table
 * @property {ChildRowMeta} [childbase] recursive childbase for this table
 *
 * @typedef {(string|number)} rowid DataTables id which identifies the row, e.g., row().id()
 *
 * @typedef {string} tablename name of table as configured in CrudChildElement.get_options()
 *
 */
/*
 * @type {ChildRowMeta} - maintains the data for all child rows
 */
var childrow_childbase = {};

/**
 * Child row management for a table
 *
 * @param {dataTable} table - dataTables instance of the table for which this child row is maintained
 * @param config - list of ChildRowElement configurations
 *          options:    options to be passed to childrow DataTables instance,
 *                      except for data: and buttons: options, passed in childdata, childbuttons
 * @param {Editor} editor - Editor instance to use for create/open form
 * @param {ChildRowMeta} base - ChildRow data is maintained here; this can be recursively used for child rows within child rows
 *          if base isn't supplied,
 * @constructor
 */
function ChildRow(table, config, editor, base) {
    var that = this;
    that.debug = true;

    if (that.debug) {console.log(new Date().toISOString() + ' ChildRow()');}

    // adapted from https://datatables.net/examples/api/row_details.html
    that.table = table;
    that.editor = editor;
    that.template = config.template;
    that.config = config;
    that.base = base;

    // clicking +/- displays the data
    that.table.on('click', 'td.details-control', function (e) {
        if (that.debug) {console.log(new Date().toISOString() + ' click event');}

        // don't let this bubble to an outer table in the case of recursive child rows
        if ( $(this).closest('table').attr('id') != $(that.table.table().node()).attr('id') ) {
            return;
        }

        var tr = $(this).closest('tr');
        var tdi = tr.find("i.fa");
        var row = that.table.row( tr );

        if ( row.child.isShown() ) {
            // This row is already open - close it, close editor if open
            that.hideChild(row);
            that.closeChild(row);
            tr.removeClass('shown');
            tdi.first().removeClass('fa-minus-square');
            tdi.first().addClass('fa-plus-square');
        }
        else {
            // Open this row
            that.showChild(row);
            tr.addClass('shown');
            tdi.first().removeClass('fa-plus-square');
            tdi.first().addClass('fa-minus-square');
        }
    } );

    // set up events
    // selecting will open the child row if it's not already open
    // if it's already open need to hide the text display and bring up the edit form
    that.table.on('select.dt', function (e, dt, type, indexes) {
        // // check if triggered by this datatable
        // if (dt.context[0].sTableId !== that.table.context[0].sTableId) return;

        if (that.debug) {console.log(new Date().toISOString() + ' select.dt event type = ' + type + ' indexes = ' + indexes);}
        var row = that.table.row( indexes );
        var tr = $(row.node());
        var tdi = tr.find("i.fa");

        if ( row.child.isShown() ) {
            // This row is already open - close it first
            that.hideChild(row);
        };
        that.editChild(row);
        tr.addClass('shown');
        tdi.first().removeClass('fa-plus-square');
        tdi.first().addClass('fa-minus-square');
    } );

    // deselect just hides the edit form and brings up the text display
    that.table.on('deselect.dt', function (e, dt, type, indexes) {
        // // check if triggered by this datatable
        // if (dt.context[0].sTableId !== that.table.context[0].sTableId) return;

        if (that.debug) {console.log(new Date().toISOString() + ' deselect.dt event type = ' + type + ' indexes = ' + indexes);}
        // var tr = editor.s.modifier;
        // var row = that.table.row( tr );
        var row = that.table.row( indexes );
        var tr = $(row.node());
        if (row.child.isShown()) {
            that.closeChild(row);
            that.showChild(row);
        }
    } );

    // prevent user select on details control column
    that.table.on('user-select.dt', function (e, dt, type, cell, originalEvent) {
        if (that.debug) {console.log(new Date().toISOString() + ' user-select.dt event');}
        if ($(cell.node()).hasClass('details-control')) {
            e.preventDefault();
        }
    });
}

/**
 * get the table id for specified row, tablename
 *
 * @param row - datatables row
 * @param tablename - name of table
 * @returns {string} - hashtagged id for table row
 */
ChildRow.prototype.getTableId = function(row, tablename) {
    var that = this;
    var rowdata = row.data();
    var tablemeta = that.getTableMeta(row, tablename);
    return '#childrow-table-' + tablemeta.tableid;
}

ChildRow.prototype.getTableMeta = function(row, tablename) {
    var rowdata = row.data();
    var tablemeta = null;
    for (var i=0; rowdata.tables && i<rowdata.tables.length; i++) {
        table = rowdata.tables[i];
        if (table.name == tablename) {
            tablemeta = table;
            break;
        }
    }
    if (tablemeta === null) {
        throw 'could not find table in row: ' + tablename;
    }
    return tablemeta;
}
/**
 * show tables for this row
 *
 * @param row - dataTables row
 * @param showedit - true if editor to be used
 */
ChildRow.prototype.showTables = function(row, showedit) {
    var that = this;
    if (that.debug) {console.log(new Date().toISOString() + ' showTables()');}

    // if there are tables, render them now
    var id = row.id();
    that.base[id] = that.base[id] || {};
    var rowdata = row.data();
    for (var i=0; rowdata.tables && i<rowdata.tables.length; i++) {
        var tablemeta = rowdata.tables[i];
        var tableconfig = that.config.childelements[tablemeta.name];

        if (tableconfig) {
            // initialize base[id][tablename] if needed
            that.base[id][tablemeta.name] = that.base[id][tablemeta.name] || {};
            var childrowtablemeta = that.base[id][tablemeta.name];

            childrowtablemeta.tableid = childrowtablemeta.tableid || that.getTableId(row, tablemeta.name);

            var buttons = [];
            var dtopts = _.cloneDeep(tableconfig.args.dtopts);
            if (showedit) {
                var edopts = _.cloneDeep(tableconfig.args.edopts);

                // add requested editor field options
                if (tableconfig.args.columns && tableconfig.args.columns.editor) {
                    var edextend = tableconfig.args.columns.editor;
                    $.each(edopts.fields, function(index, field) {
                        if (edextend.hasOwnProperty(field.name)) {
                            $.extend(field, edextend[field.name]);
                        }
                    })
                }

                // if inline editing is requested, annotate the fields with _inline-edit class
                // note need to do this with dtopts as the dtopts.col.className option takes precedence
                if (tableconfig.args.inline) {
                    var inline = tableconfig.args.inline;
                    $.each(dtopts.columns, function(index, col) {
                        if (inline.hasOwnProperty(col.data)) {
                            // not quite sure why I'm using 'class' not 'className'
                            // see https://datatables.net/reference/option/columns.className
                            col.className = (col.className || '') + ' _inline_edit'
                        }
                    });
                }

                $.extend(edopts, {
                    table: childrowtablemeta.tableid
                });

                // configure childrow options for editor if so configured
                if ( ! $.isEmptyObject( tableconfig.args.cropts ) ) {
                    if (tableconfig.args.cropts.showeditor) {
                        $.extend(edopts, {display:onPageDisplay('#childrow-editform-' + tablemeta.tableid)})
                    }
                }

                // create child row editor
                childrowtablemeta.editor = new $.fn.dataTable.Editor(edopts);

                // set up special event handlers for group management, if requested
                if (register_group_for_editor) {
                    if (that.config.group) {
                        if (!that.config.groupselector) {
                            throw 'groupselected required if group configured'
                        }
                        register_group_for_editor(that.config.group, that.config.groupselector, childrowtablemeta.editor)
                        set_editor_event_handlers(childrowtablemeta.editor)
                    }
                }

                // if inline editing requested, add a handler
                if (tableconfig.args.inline) {
                    $( childrowtablemeta.tableid ).on('click', '._inline_edit', function() {
                        // get inline parameters
                        var colname = childrowtablemeta.editor.fields()[this._DT_CellIndex.column];
                        var inlineopts = tableconfig.args.inline[colname];
                        childrowtablemeta.editor.inline(this, inlineopts);
                    });
                }

                // if createfieldvals requested, add a handler which initializes fields when create form displayed
                if (tablemeta.createfieldvals) {
                    // save for initCreate function
                    childrowtablemeta.editor.createfieldvals = tablemeta.createfieldvals;
                    childrowtablemeta.editor.on('initCreate.dt', function(e) {
                        var that = this;
                        $.each(this.createfieldvals, function(field, val) {
                            that.field(field).val(val);
                        });
                    });
                }

                // buttons for datatable need to point at this editor
                // TODO: need to determine if 'edit' or 'editRefresh is appropriate, based on configuration
                buttons = [
                    {extend:'create', editor:childrowtablemeta.editor},
                    {extend:'editRefresh', editor:childrowtablemeta.editor},
                    {extend:'remove', editor:childrowtablemeta.editor}
                ];
            }
            // add requested datatable column options
            if (tableconfig.args.columns && tableconfig.args.columns.datatable) {
                var dtextend = tableconfig.args.columns.datatable;
                $.each(dtopts.columns, function(index, col) {
                    if (dtextend.hasOwnProperty(col.data)) {
                        $.extend(col, dtextend[col.data]);
                    }
                })
            }
            $.extend(dtopts, {
                // TODO: ajax assumes serverside=True
                ajax: {
                    url: tablemeta.url,
                    type: 'get'
                },
                buttons: buttons,
                // need to remove scrollCollapse as we don't want to hide rows
                scrollCollapse: false,
            });
            if (tableconfig.args.updatedtopts) {
                $.extend(dtopts, tableconfig.args.updatedtopts);
            }
            if (!showedit) {
                $.extend(dtopts, {
                    select: false
                });
            };
            var table = $( childrowtablemeta.tableid );
            childrowtablemeta.table = table
                // don't let select / deselect propogate to the parent table
                // from https://datatables.net/forums/discussion/comment/175517/#Comment_175517
                .on('select.dt deselect.dt', function (e) {
                    e.stopPropagation();
                })
                .DataTable(dtopts);

            // configure childrow if so configured
            if ( ! $.isEmptyObject( tableconfig.args.cropts ) ) {
                // sets up child row event handling, and initializes child elements as needed
                childrowtablemeta.childbase = {}
                var childsubrow = new ChildRow(childrowtablemeta.table, tableconfig.args.cropts, childrowtablemeta.editor, childrowtablemeta.childbase);
            }


        } else {
            throw 'table missing from config.childelements: ' + tablemeta.name;
        }
    }
}

/**
 * destroy tables and editors
 *
 * @param row - datatables row
 */
ChildRow.prototype.destroyTables = function(row) {
    var that = this;
    if (that.debug) {console.log(new Date().toISOString() + ' destroyTables()');}

    var id = row.id();

    // kill table(s) and editor(s) if they exist
    if (that.base[id]) {
        $.each(that.base[id], function(tablename, rowtablemeta) {
            var table = $( that.base[id][tablename].tableid );
            table.detach();
            table.DataTable().destroy();
            if (rowtablemeta.editor) {
                var editor = rowtablemeta.editor;
                editor.destroy();
            }
        })
        delete that.base[id];
    }
}

/**
 * show child row
 *
 * @param row - row which gets expanded
 */
ChildRow.prototype.showChild = function(row) {
    var that = this;
    if (that.debug) {console.log(new Date().toISOString() + ' showChild()');}

    // see see https://datatables.net/examples/api/row_details.html, https://datatables.net/blog/2019-01-11
    var env = new nunjucks.Environment();
    var rowdata = row.data();
    rowdata._showedit = false;
    row.child(env.render(that.template, rowdata)).show();

    // show tables
    that.showTables(row, rowdata._showedit);
};

/**
 * hide child row
 *
 * @param row - row to hide
 */
ChildRow.prototype.hideChild = function(row) {
    var that = this;
    if (that.debug) {console.log(new Date().toISOString() + ' hideChild()');}

    var id = row.id();

    // remove table(s) and editor(s)
    that.destroyTables(row);

    row.child.hide();
};

ChildRow.prototype.editChild = function(row) {
    var that = this;
    if (that.debug) {console.log(new Date().toISOString() + ' editChild()');}

    // see see https://datatables.net/examples/api/row_details.html, https://datatables.net/blog/2019-01-11
    var env = new nunjucks.Environment();
    var rowdata = row.data();
    rowdata._showedit = true;
    // todo: create table(s) and add to rowdata
    row.child(env.render(that.template, rowdata)).show();

    that.editor
        .title('Edit')
        .buttons([
            {
                "label": "Save",
                "fn": function () {
                    that.editor.submit();
                }
            }
        ])
        .edit(row); // in https://datatables.net/forums/discussion/62880

    // todo: add event handlers to make 'dirty' class to force saving later

    // show tables
    that.showTables(row, rowdata._showedit);
}

/**
 * close child row
 *
 * @param row - row to hide
 */
ChildRow.prototype.closeChild = function(row) {
    var that = this;
    if (that.debug) {console.log(new Date().toISOString() + ' closeChild()');}

    var rowdata = row.data();

    // remove table(s) and editor(s)
    that.destroyTables(row);

    row.child.hide();
};
