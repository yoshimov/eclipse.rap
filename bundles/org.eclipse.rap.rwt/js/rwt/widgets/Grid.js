/*******************************************************************************
 * Copyright (c) 2010, 2013 Innoopract Informationssysteme GmbH and others.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *    Innoopract Informationssysteme GmbH - initial API and implementation
 *    EclipseSource - ongoing development
 ******************************************************************************/

rwt.qx.Class.define( "rwt.widgets.Grid", {

  extend : rwt.widgets.base.Parent,

  construct : function( argsMap ) {
    this.base( arguments );
    this._rootItem = new rwt.widgets.GridItem();
    // Style-Flags:
    this._hasMultiSelection = false;
    // Internal State:
    this._hasSelectionListener = false;
    this._hasDefaultSelectionListener = false;
    this._leadItem = null;
    this._topItemIndex = 0;
    this._topItem = null;
    this._hasSetDataListener = false;
    this._selection = [];
    this._focusItem = null;
    this._renderQueue = {};
    this._resizeLine = null;
    this._selectionTimestamp = null;
    this._selectionOffsetX = null;
    this._delayedSelection = false;
    this._sortDirection = null;
    this._sortColumn = null;
    this._hasFixedColumns = false;
    this._hasExpandListener = false;
    this._hasCollapseListener = false;
    // Layout:
    this._headerHeight = 0;
    this._footerHeight = 0;
    this._itemHeight = 16;
    // Timer & Border
    this._mergeEventsTimer = new rwt.client.Timer( 50 );
    // Subwidgets
    this._rowContainer = rwt.widgets.util.GridUtil.createTreeRowContainer( argsMap );
    this._columns = {};
    this._horzScrollBar = new rwt.widgets.base.ScrollBar( true );
    this._vertScrollBar = new rwt.widgets.base.ScrollBar( false );
    this._header = null;
    this._footer = null;
    this.add( this._rowContainer );
    this.add( this._horzScrollBar );
    this.add( this._vertScrollBar );
    this._cellToolTip = null;
    // Configure:
    this._config = this._rowContainer.getRenderConfig();
    this.setCursor( "default" );
    this.setOverflow( "hidden" );
    // Disable scrolling (see bugs 279460 and 364739)
    rwt.widgets.base.Widget.disableScrolling( this );
    this._configureScrollBars();
    this._registerListeners();
    this._parseArgsMap( argsMap );
  },

  destruct : function() {
    this._rootItem.removeEventListener( "update", this._onItemUpdate, this );
    this._rootItem.dispose();
    this._rootItem = null;
    this._mergeEventsTimer.dispose();
    this._mergeEventsTimer = null;
    this._rowContainer = null;
    this._header = null;
    this._footer = null;
    this._horzScrollBar = null;
    this._vertScrollBar = null;
    this._leadItem = null;
    this._focusItem = null;
    this._sortColumn = null;
    this._resizeLine = null;
    if( this._cellToolTip ) {
      this._cellToolTip.destroy();
      this._cellToolTip = null;
    }
  },

  members : {

    /////////////////////////////////
    // Contructor & Subwidget helpers

    _createHeader : function() {
      this._header = new rwt.widgets.base.GridHeader( {
        "appearance" : this.getAppearance(),
        "splitContainer" : this._hasFixedColumns
      } );
      this.add( this._header );
      this._header.addEventListener( "showResizeLine", this._onShowResizeLine, this );
      this._header.addEventListener( "hideResizeLine", this._onHideResizeLine, this );
      this._header.setTop( 0 );
      this._header.setLeft( 0 );
      this._header.setScrollLeft( this._horzScrollBar.getValue() );
      this._scheduleColumnUpdate();
    },

    _createFooter : function() {
      this._footer = new rwt.widgets.base.GridHeader( {
        "appearance" : this.getAppearance(),
        "splitContainer" : this._hasFixedColumns,
        "footer" : true
      } );
      this.add( this._footer );
      this._footer.setLeft( 0 );
      this._footer.setScrollLeft( this._horzScrollBar.getValue() );
      this._scheduleColumnUpdate();
    },

    _configureScrollBars : function() {
      var dragBlocker = function( event ) { event.stopPropagation(); };
      this._horzScrollBar.setZIndex( 1e8 );
      this._horzScrollBar.setVisibility( false );
      this._horzScrollBar.setLeft( 0 );
      this._horzScrollBar.setMergeEvents( false );
      this._horzScrollBar.addEventListener( "dragstart", dragBlocker );
      this._vertScrollBar.setZIndex( 1e8 );
      this._vertScrollBar.setVisibility( false );
      this._vertScrollBar.setIncrement( 16 );
      this._vertScrollBar.setMergeEvents( false );
      this._vertScrollBar.addEventListener( "dragstart", dragBlocker );
    },

    _registerListeners : function() {
      this._rootItem.addEventListener( "update", this._onItemUpdate, this );
      this.addEventListener( "mousedown", this._onMouseDown, this );
      this.addEventListener( "mouseup", this._onMouseUp, this );
      this.addEventListener( "click", this._onClick, this );
      this.addEventListener( "mouseout", this._onMouseOut, this );
      this.addEventListener( "keypress", this._onKeyPress, this );
      this._rowContainer.addEventListener( "mousewheel", this._onClientAreaMouseWheel, this );
      this._mergeEventsTimer.addEventListener( "interval", this._updateTopItemIndex, this );
      this._horzScrollBar.addEventListener( "changeValue", this._onHorzScrollBarChangeValue, this );
      this._vertScrollBar.addEventListener( "changeValue", this._onVertScrollBarChangeValue, this );
      this._rowContainer.setSelectionProvider( this.isItemSelected, this );
      this._rowContainer.setPostRenderFunction( this._vertScrollBar.autoEnableMerge,
                                                this._vertScrollBar );
    },

    _parseArgsMap : function( map ) {
      if( map.noScroll ) {
        this._rowContainer.removeEventListener( "mousewheel", this._onClientAreaMouseWheel, this );
      }
      if( map.hideSelection ) {
        this._config.hideSelection = true;
      }
      if( map.multiSelection ) {
        this._hasMultiSelection = true;
      }
      if( map.fullSelection ) {
        this._config.fullSelection = true;
      } else {
        this._config.selectionPadding = map.selectionPadding;
      }
      if( map.check ) {
        this._config.hasCheckBoxes = true;
        this._config.checkBoxLeft = map.checkBoxMetrics[ 0 ];
        this._config.checkBoxWidth = map.checkBoxMetrics[ 1 ];
      }
      if( typeof map.indentionWidth === "number" ) {
        this._config.indentionWidth = map.indentionWidth;
      }
      if( map.markupEnabled ) {
        this._config.markupEnabled = true;
      }
      this._hasFixedColumns = map.splitContainer;
      this._config.baseAppearance = map.appearance;
      this._rowContainer.setBaseAppearance( map.appearance );
      this.setAppearance( map.appearance );
    },

    ///////////////////////////
    // API for server - general

    setItemCount : function( value ) {
      this._rootItem.setItemCount( value );
    },

    setHeaderVisible : function( value ) {
      if( value && this._header == null ) {
        this._createHeader();
      } else if( !value ) {
        this._header.destroy();
        this._header = null;
      }
      this._layoutX();
      this._layoutY();
    },

    setFooterVisible : function( value ) {
      if( value && this._footer == null ) {
        this._createFooter();
      } else if( !value ) {
        this._footer.destroy();
        this._footer = null;
      }
      this._scheduleUpdate( "scrollHeight" );
      this._layoutX();
      this._layoutY();
    },

    setHeaderHeight : function( value ) {
      this._headerHeight = value;
      this._layoutX();
      this._layoutY();
    },

    setFooterHeight : function( value ) {
      this._footerHeight = value;
      this._scheduleUpdate( "scrollHeight" );
      this._layoutX();
      this._layoutY();
    },

    setItemHeight : function( height ) {
      this._itemHeight = height;
      this._vertScrollBar.setIncrement( height );
      this._rowContainer.setRowHeight( height );
      this._rootItem.setDefaultHeight( height );
      this._scheduleUpdate( "scrollHeight" );
    },

    setColumnCount : function( count ) {
      this._config.columnCount = count;
      this._scheduleUpdate();
      this._updateScrollWidth();
    },

    setItemMetrics : function( columnIndex,
                               left,
                               width,
                               imageLeft,
                               imageWidth,
                               textLeft,
                               textWidth,
                               checkLeft,
                               checkWidth )
    {
      this._config.itemLeft[ columnIndex ] = left;
      this._config.itemWidth[ columnIndex ] = width;
      this._config.itemImageLeft[ columnIndex ] = imageLeft;
      this._config.itemImageWidth[ columnIndex ] = imageWidth;
      this._config.itemTextLeft[ columnIndex ] = textLeft;
      this._config.itemTextWidth[ columnIndex ] = textWidth;
      if( !isNaN( checkLeft ) ) {
        this._config.itemCellCheckLeft[ columnIndex ] = checkLeft;
        this._config.itemCellCheckWidth[ columnIndex ] = checkWidth;
      }
      this._scheduleUpdate();
      this._updateScrollWidth();
    },

    setTreeColumn : function( columnIndex ) {
      this._config.treeColumn = columnIndex;
    },

    setTopItemIndex : function( index ) {
      this._updateScrollHeight();
      var offset = 0;
      var item = this._rootItem.findItemByFlatIndex( index );
      if( item != null ) {
        offset = item.getOffset();
      }
      this._vertScrollBar.setValue( offset );
      if( !this._inServerResponse() ) {
        rwt.widgets.base.Widget.flushGlobalQueues();
      }
    },

    getTopItemIndex : function() {
      return this._topItemIndex;
    },

    setScrollLeft: function( value ) {
      this._horzScrollBar.setValue( value );
    },

    selectItem : function( item ) {
      this._selectItem( item, false );
      this._scheduleItemUpdate( item );
    },

    deselectItem : function( item ) {
      this._deselectItem( item, false );
      this._scheduleItemUpdate( item );
    },

    setFocusItem : function( item ) {
      this._focusItem = item;
      this._sendItemFocusChange();
    },

    setSortDirection : function( direction ) {
      this._sortDirection = direction;
      if( this._sortColumn !== null ) {
        this._sortColumn.setSortDirection( this._sortDirection );
      }
    },

    setSortColumn : function( column ) {
      if( this._sortColumn !== null ) {
        this._sortColumn.setSortDirection( "none" );
      }
      this._sortColumn = column;
      if( this._sortColumn !== null ) {
        this._sortColumn.setSortDirection( this._sortDirection );
      }
    },

    setScrollBarsVisible : function( horzVisible, vertVisible ) {
      if( !horzVisible ) {
        this._horzScrollBar.setValue( 0 );
      }
      this._horzScrollBar.setVisibility( horzVisible );
      if( !vertVisible ) {
        this._vertScrollBar.setValue( 0 );
      }
      this._vertScrollBar.setVisibility( vertVisible );
      this._layoutX();
      this._layoutY();
    },

    getVerticalBar : function() {
      return this._vertScrollBar;
    },

    getHorizontalBar : function() {
      return this._horzScrollBar;
    },

    isVerticalBarVisible : function() {
      return this._vertScrollBar.getVisibility();
    },

    isHorizontalBarVisible : function() {
      return this._horzScrollBar.getVisibility();
    },

    setHasSelectionListener : function( value ) {
      this._hasSelectionListener = value;
    },

    setHasDefaultSelectionListener : function( value ) {
      this._hasDefaultSelectionListener = value;
    },

    setHasExpandListener : function( value ) {
      this._hasExpandListener = value;
    },

    setHasCollapseListener : function( value ) {
      this._hasCollapseListener = value;
    },

    setHasSetDataListener : function( value ) {
      this._hasSetDataListener = value;
    },

    setAlignment : function( column, value ) {
      this._config.alignment[ column ] = value;
      this._scheduleUpdate();
    },

    setCellCheck : function( column, value ) {
      this._config.itemCellCheck[ column ] = value;
      this._scheduleUpdate();
    },

    setLinesVisible : function( value ) {
      this._config.linesVisible = value;
      if( value ) {
        this.addState( "linesvisible" );
      } else {
        this.removeState( "linesvisible" );
      }
      this._rowContainer.updateRowLines();
      this._scheduleUpdate();
    },

    setAlwaysHideSelection : function( value ) {
      this._config.alwaysHideSelection = value;
      this._scheduleUpdate();
    },

    //////////////
    // Overwritten

    addState : function( state ) {
      this.base( arguments, state );
      if( state.slice( 0, 8 ) === "variant_" ) {
        this._config.variant = state;
      }
    },

    removeState : function( state ) {
      if( this._config.variant === state ) {
        this._config.variant = null;
      }
      this.base( arguments, state );
    },

    ///////////////////////////////////////////////
    // API for Tests, DND, TreeUtil and TableColumn

    getRenderConfig : function() {
      return this._config;
    },

    getRootItem : function() {
      return this._rootItem;
    },

    isFocusItem : function( item ) {
      return this._focusItem === item;
    },

    isItemSelected : function( item ) {
      return this._selection.indexOf( item ) != -1;
    },

    getRowContainer : function() {
      return this._rowContainer;
    },

    getTableHeader : function() {
      return this._header;
    },

    getFooter : function() {
      return this._footer;
    },

    update : function() {
      this._scheduleUpdate();
    },

    addColumn : function( column ) {
      //this.getTableHeader().addColumn( column );
      this._columns[ column.toHashCode() ] = column;
      column.addEventListener( "update", this._scheduleColumnUpdate, this );
      this._scheduleColumnUpdate();
    },

    removeColumn : function( column ) {
      //this.getTableHeader().removeColumn( column );
      delete this._columns[ column.toHashCode() ];
      column.removeEventListener( "update", this._scheduleColumnUpdate, this );
      this._scheduleColumnUpdate();
    },

    ////////////////
    // event handler

    _onItemUpdate : function( event ) {
      var item = event.target;
      if( event.msg === "collapsed" ) {
        if(    this._focusItem
            && ( this._focusItem.isDisposed() || this._focusItem.isChildOf( item ) )
        ) {
          this.setFocusItem( item );
        }
      }
      if( event.msg === "remove" ) {
        this._scheduleUpdate( "checkDisposedItems" );
      }
      this._sendItemUpdate( item, event );
      this._renderItemUpdate( item, event );
      return false;
    },

    _beforeAppear : function() {
      this.base( arguments );
      this._scheduleColumnUpdate();
    },

    _scheduleColumnUpdate : function() {
      rwt.widgets.base.Widget.addToGlobalWidgetQueue( this );
      this._scheduleUpdate();
    },

    flushWidgetQueue : function() {
      this._updateColumns();
    },

    _onVertScrollBarChangeValue : function() {
      if( this._vertScrollBar._internalValueChange ) {
        // NOTE : IE can create several scroll events with one click. Using
        // this timer to merge theses events improves performance a bit.
        this._mergeEventsTimer.start();
      } else {
        this._updateTopItemIndex();
      }
    },

    _updateTopItemIndex : function() {
      this._mergeEventsTimer.stop();
      var scrollTop = this._vertScrollBar.getValue();
      var beforeTopitem = this._rootItem.findItemByOffset( scrollTop - 1 );
      if( beforeTopitem ) {
        this._topItemIndex = beforeTopitem.getFlatIndex() + 1;
        this._topItem = beforeTopitem.getNextItem();
      } else {
        this._topItemIndex = 0;
        this._topItem = null;
      }
      if( this._inServerResponse() ) {
        this._scheduleUpdate( "topItem" );
      } else {
        this._sendTopItemIndexChange();
        this._updateTopItem( true );
      }
    },

    _onHorzScrollBarChangeValue : function() {
      this._rowContainer.setScrollLeft( this._horzScrollBar.getValue() );
      if( this._header ) {
        this._header.setScrollLeft( this._horzScrollBar.getValue() );
      }
      if( this._footer ) {
        this._footer.setScrollLeft( this._horzScrollBar.getValue() );
      }
      this._sendScrollLeftChange();
    },

    _onMouseDown : function( event ) {
      this._delayedSelection = false;
      if( !this._checkAndProcessHyperlink( event ) ) {
        var target = event.getOriginalTarget();
        if( target instanceof rwt.widgets.base.GridRow ) {
          this._onRowMouseDown( target, event );
        }
      }
    },

    _onMouseUp : function( event ) {
      if( this._delayedSelection ) {
        this._onMouseDown( event );
      } else {
        this._checkAndProcessHyperlink( event );
      }
    },

    _onClick : function( event ) {
      this._checkAndProcessHyperlink( event );
    },

    _onRowMouseDown : function( row, event ) {
      var item = this._rowContainer.findItemByRow( row );
      if( item != null ) {
        var identifier = row.getTargetIdentifier( event );
        if( identifier[ 0 ] === "expandIcon" && item.hasChildren() ) {
          var expanded = !item.isExpanded();
          if( !expanded ) {
            this._deselectVisibleChildren( item );
          }
          item.setExpanded( expanded );
        } else if( identifier[ 0 ] === "checkBox" || identifier[ 0 ] === "cellCheckBox" ) {
          this._toggleCheckSelection( item, identifier[ 1 ] );
        } else if( this._isSelectionClick( identifier ) ) {
          this._onSelectionClick( event, item );
        }
      }
    },

    _checkAndProcessHyperlink : function( event ) {
      var hyperlink = null;
      var target = event.getOriginalTarget();
      if( this._config.markupEnabled && target instanceof rwt.widgets.base.GridRow ) {
        hyperlink = this._findHyperlink( event );
        if( hyperlink !== null && this._isRWTHyperlink( hyperlink ) ) {
          event.setDefaultPrevented( true );
          if( event.getType() === "click" ) {
            var item = this._rowContainer.findItemByRow( target );
            var text = hyperlink.getAttribute( "href" );
            if( !text ) {
              text = hyperlink.innerHTML;
            }
            this._sendSelectionEvent( item, false, "hyperlink", undefined, text );
          }
        }
      }
      return hyperlink !== null;
    },

    _findHyperlink : function( event ) {
      var targetNode = event.getDomTarget();
      var tagName = targetNode.tagName.toLowerCase();
      while( tagName !== 'a' && tagName !== 'div' ) {
        targetNode = targetNode.parentNode;
        tagName = targetNode.tagName.toLowerCase();
      }
      return tagName === 'a' ? targetNode : null;
    },

    _isRWTHyperlink : function( hyperlink ) {
      return hyperlink.getAttribute( "target" ) === "_rwt";
    },

    _isSelectionClick : function( identifier ) {
      var result;
      if( this._config.fullSelection ) {
        result = identifier[ 0 ] !== "checkBox";
      } else {
        result = identifier[ 0 ] === "treeColumn";
      }
      return result;
    },

    _onSelectionClick : function( event, item ) {
      // NOTE: Using a listener for "dblclick" does not work because the
      //       item is re-rendered on mousedown which prevents the dom-event.
      var doubleClick = this._isDoubleClicked( event, item );
      if( doubleClick ) {
        this._sendSelectionEvent( item, true, null );
      } else {
        if( this._hasMultiSelection ) {
          if( !this._delayMultiSelect( event, item ) ) {
            this._multiSelectItem( event, item );
          }
        } else {
          this._singleSelectItem( event, item );
        }
      }
    },

    _delayMultiSelect : function( event, item ) {
      if( this._isDragSource() && this.isItemSelected( item ) && event.getType() === "mousedown" ) {
        this._delayedSelection = true;
      }
      return this._delayedSelection;
    },

    _onMouseOut : function( event ) {
      this._delayedSelection = false;
    },

    _onClientAreaMouseWheel : function( event ) {
      event.preventDefault();
      event.stopPropagation();
      var change = event.getWheelDelta() * this._itemHeight * 2;
      this._vertScrollBar.setValue( this._vertScrollBar.getValue() - change );
      this._vertScrollBar.setValue( this._vertScrollBar.getValue() ); // See Bug 396309
    },

    _onKeyPress : function( event ) {
      if( this._focusItem != null ) {
        switch( event.getKeyIdentifier() ) {
          case "Enter":
            this._handleKeyEnter( event );
          break;
          case "Space":
            this._handleKeySpace( event );
          break;
          case "Up":
            this._handleKeyUp( event );
          break;
          case "Down":
            this._handleKeyDown( event );
          break;
          case "PageUp":
            this._handleKeyPageUp( event );
          break;
          case "PageDown":
            this._handleKeyPageDown( event );
          break;
          case "Home":
            this._handleKeyHome( event );
          break;
          case "End":
            this._handleKeyEnd( event );
          break;
          case "Left":
            this._handleKeyLeft( event );
          break;
          case "Right":
            this._handleKeyRight( event );
          break;
        }
      }
      this._stopKeyEvent( event );
    },

    _stopKeyEvent : function( event ) {
      switch( event.getKeyIdentifier() ) {
        case "Up":
        case "Down":
        case "Left":
        case "Right":
        case "Home":
        case "End":
        case "PageUp":
        case "PageDown":
          event.preventDefault();
          event.stopPropagation();
        break;
      }
    },

    // TODO [tb] : handle by event via TableHeader instead of direct call
    _onShowResizeLine : function( event ) {
      var x = event.position;
      if( this._resizeLine === null ) {
        this._resizeLine = new rwt.widgets.base.Terminator();
        this._resizeLine.setAppearance( "table-column-resizer" );
        this.add( this._resizeLine );
        rwt.widgets.base.Widget.flushGlobalQueues();
      }
      var top = this._rowContainer.getTop();
      this._resizeLine._renderRuntimeTop( top );
      var left = x - 2 - this._horzScrollBar.getValue();
      this._resizeLine._renderRuntimeLeft( left );
      var height = this._rowContainer.getHeight();
      this._resizeLine._renderRuntimeHeight( height );
      this._resizeLine.removeStyleProperty( "visibility" );
    },

    _onHideResizeLine : function() {
      this._resizeLine.setStyleProperty( "visibility", "hidden" );
    },

    _handleKeyEnter : function( event ) {
      this._sendSelectionEvent( this._focusItem, true, null );
    },

    _handleKeySpace : function( event ) {
      if( event.isCtrlPressed() || !this.isItemSelected( this._focusItem ) ) {
        // NOTE: When space does not change the selection, the SWT Tree still fires an selection
        //       event, while the Table doesnt. Table behavior is used since it makes more sense.
        var itemIndex = this._focusItem.getFlatIndex();
        this._handleKeyboardSelect( event, this._focusItem, itemIndex );
      }
      if( this._config.hasCheckBoxes ) {
        this._toggleCheckSelection( this._focusItem );
      }
    },

    _handleKeyUp : function( event ) {
      var item = this._focusItem.getPreviousItem();
      if( item != null ) {
        var itemIndex = item.getFlatIndex();
        this._handleKeyboardSelect( event, item, itemIndex );
      }
    },

    _handleKeyDown : function( event ) {
      var item = this._focusItem.getNextItem();
      if( item != null ) {
        var itemIndex = item.getFlatIndex();
        this._handleKeyboardSelect( event, item, itemIndex );
      }
    },

    _handleKeyPageUp : function( event ) {
      var oldOffset = this._focusItem.getOffset();
      var diff = this._rowContainer.getHeight();
      var newOffset = Math.max( 0, oldOffset - diff );
      var item = this._rootItem.findItemByOffset( newOffset );
      if( newOffset !== 0 ) {
        item = item.getNextItem();
      }
      var itemIndex = item.getFlatIndex();
      this._handleKeyboardSelect( event, item, itemIndex );
    },

    _handleKeyPageDown : function( event ) {
      var oldOffset = this._focusItem.getOffset();
      var diff = this._rowContainer.getHeight();
      var max = this.getRootItem().getOffsetHeight() - 1;
      var newOffset = Math.min( max, oldOffset + diff );
      var item = this._rootItem.findItemByOffset( newOffset );
      if( newOffset !== max ) {
        item = item.getPreviousItem();
      }
      var itemIndex = item.getFlatIndex();
      this._handleKeyboardSelect( event, item, itemIndex );
    },

    _handleKeyHome : function( event ) {
      var item = this.getRootItem().getChild( 0 );
      this._handleKeyboardSelect( event, item, 0 );
    },

    _handleKeyEnd : function( event ) {
      var item = this.getRootItem().getLastChild();
      var itemIndex = this.getRootItem().getVisibleChildrenCount() - 1;
      this._handleKeyboardSelect( event, item, itemIndex );
    },

    _handleKeyLeft : function( event ) {
      if( this._focusItem.isExpanded() ) {
        this._focusItem.setExpanded( false );
      } else if( !this._focusItem.getParent().isRootItem() ) {
        var item = this._focusItem.getParent();
        var itemIndex = item.getFlatIndex();
        this._handleKeyboardSelect( event, item, itemIndex, true );
      }
    },

    _handleKeyRight : function( event ) {
      if( this._focusItem.hasChildren() ) {
        if( !this._focusItem.isExpanded() ) {
          this._focusItem.setExpanded( true );
        } else {
          var item = this._focusItem.getChild( 0 );
          var itemIndex = item.getFlatIndex();
          this._handleKeyboardSelect( event, item, itemIndex, true );
        }
      }
    },

    _handleKeyboardSelect : function( event, item, itemIndex, suppressMulti ) {
      if( this._hasMultiSelection && !suppressMulti ) {
        this._multiSelectItem( event, item );
      } else {
        this._singleSelectItem( event, item );
      }
      this._scrollIntoView( itemIndex, item );
    },

    /////////////////
    // render content

    _updateColumns : function() {
      this._updateScrollWidth();
      if( this._header != null ) {
        this._header.renderColumns( this._columns );
      }
      if( this._footer != null ) {
        this._footer.renderColumns( this._columns );
      }
    },

    _renderItemUpdate : function( item, event ) {
      if( item.isDisplayable() ) {
        switch( event.msg ) {
          case "expanded":
          case "collapsed":
          case "height":
            this._topItem = null;
            this._scheduleUpdate( "scrollHeight" );
          break;
          case "add":
          case "remove":
            // NOTE: the added/removed item is a child of this item
            if( item.isExpanded() ) {
              this._scheduleUpdate( "scrollHeight" );
            } else {
              this._scheduleItemUpdate( item );
            }
            this._topItem = null;
          break;
          default:
            if( this._inServerResponse() ) {
              this._scheduleItemUpdate( item );
            } else {
              this._rowContainer.renderItem( item );
            }
          break;
        }
      }
    },

    /**
     * This will schedule the entire content of the tree (visible rows and gridlines)
     * to be re-rendered. Additional tasks my be executed depending on "task" parameter.
     * Is only used within a server-response or when expanding/collapsing. Not used
     * when user is scrolling.
     */
    _scheduleUpdate : function( task ) {
      if( task !== undefined ) {
        this.addToQueue( task );
      }
      this._renderQueue[ "allItems" ] = true;
      this.addToQueue( "updateRows" );
    },

    /**
     * Optimized version of _scheduleUpdate. Used when server only changes specific items.
     */
    _scheduleItemUpdate : function( item ) {
      this._renderQueue[ item.toHashCode() ] = item;
      this.addToQueue( "updateRows" );
    },

    _layoutPost : function( changes ) {
      this.base( arguments, changes );
      if( changes[ "checkDisposedItems" ] ) {
        this._checkDisposedItems();
      }
      if( changes[ "scrollHeight" ] ) {
        this._updateScrollHeight();
      }
      if( changes[ "scrollHeight" ] || changes[ "topItem" ] ) {
        this._updateTopItem( false );
      }
      if( changes[ "updateRows" ] ) {
        if( this._renderQueue[ "allItems" ] ) {
          this._rowContainer.renderAll();
        } else {
          this._rowContainer.renderItemQueue( this._renderQueue );
        }
        this._renderQueue = {};
      }
    },

    ////////////
    // scrolling

    _updateScrollHeight : function() {
      var itemsOffsetHeight = this.getRootItem().getOffsetHeight();
      var height = itemsOffsetHeight + ( this._footer ? this._footerHeight : 0 );
      // recalculating topItem can be expensive, therefore this simple check:
      if( this._vertScrollBar.getMaximum() != height ) {
        // Without the check, it may cause an error in FF when unloading doc
        if( !this._vertScrollBar.getDisposed() ) {
          this._vertScrollBar.setMaximum( height );
        }
      }
    },

    /**
     * NOTE: If render is true, the content will be updated immediately. The rendering
     * assumes that no other parameter than topItem have changed and may optimize accordingly.
     */
    _updateTopItem : function( render ) {
      this._rowContainer.setTopItem( this._getTopItem(), this._topItemIndex, render );
    },

    _updateScrollWidth : function() {
      var width = this._getItemWidth();
      this._rowContainer.setRowWidth( this._getRowWidth() );
      if( !this._horzScrollBar.getDisposed() ) {
        this._horzScrollBar.setMaximum( width );
      }
      var headerOverlap = this._vertScrollBar.getVisibility() ? this._vertScrollBar.getWidth() : 0;
      if( this._header ) {
        this._header.setScrollWidth( width + headerOverlap );
      }
      if( this._footer ) {
        this._footer.setScrollWidth( width );
      }
    },

    _scrollIntoView : function( index, item ) {
      if( index < this._topItemIndex ) {
        this.setTopItemIndex( index );
      } else if( index > this._topItemIndex ) {
        var topItem = this._getTopItem();
        var topItemOffset = topItem.getOffset();
        var itemOffset = item.getOffset();
        var pageSize = this._rowContainer.getHeight() - item.getOwnHeight();
        if( itemOffset > topItemOffset + pageSize ) {
          var newTopOffset = itemOffset - pageSize - 1;
          var newTopItem = this.getRootItem().findItemByOffset( newTopOffset );
          var newTopIndex = newTopItem.getFlatIndex() + 1;
          this.setTopItemIndex( newTopIndex );
        }
      }
    },

    setHasScrollBarsSelectionListener : function( value ) {
      this._vertScrollBar.setHasSelectionListener( true );
      this._horzScrollBar.setHasSelectionListener( true );
    },

    //////////////
    // Send events

    _sendSelectionChange : function( item ) {
      if( !this._inServerResponse() ) {
        var selection = this._getSelectionList();
        rwt.remote.Connection.getInstance().getRemoteObject( this ).set( "selection", selection );
        this._sendSelectionEvent( item, false, null );
      }
    },

    _sendItemCheckedChange : function( item ) { // TODO [tb] : item events should be send by item
      if( !this._inServerResponse() ) {
        rwt.remote.Connection.getInstance().getRemoteObject( item ).set( "checked", item.isChecked() );
        this._sendSelectionEvent( item, false, "check" );
      }
    },

    _sendCellCheckedChange : function( item, cell ) { // TODO [tb] : item events should be send by item
      if( !this._inServerResponse() ) {
        var server = rwt.remote.Connection.getInstance();
        var arr = item.getCellChecked();
        var sendArr = [];
        for( var i = 0; i < this._config.columnCount; i++ ) {
          sendArr[ i ] = arr[ i ] === true;
        }
        server.getRemoteObject( item ).set( "cellChecked", sendArr );
        this._sendSelectionEvent( item, false, "check", cell );
      }
    },

    _sendItemFocusChange : function() {
      if( !this._inServerResponse() ) {
        var focusItemId = this._getItemId( this._focusItem );
        rwt.remote.Connection.getInstance().getRemoteObject( this ).set( "focusItem", focusItemId );
      }
    },

    _sendTopItemIndexChange : function() {
      var server = rwt.remote.Connection.getInstance();
      var remoteObject = server.getRemoteObject( this );
      remoteObject.set( "topItemIndex", this._topItemIndex );
      if( this._hasSetDataListener || this._vertScrollBar.getHasSelectionListener() ) {
        this._startScrollBarChangesTimer( false );
      }
    },

    _sendScrollLeftChange : function() {
      // TODO [tb] : There should be a check for _inServerResponse,
      // but currently this is needed to sync the value with the
      // server when the scrollbars are hidden by the server.
      var server = rwt.remote.Connection.getInstance();
      var remoteObject = server.getRemoteObject( this );
      remoteObject.set( "scrollLeft", this._horzScrollBar.getValue() );
      if( this._hasSetDataListener || this._horzScrollBar.getHasSelectionListener() ) {
        this._startScrollBarChangesTimer( true );
      }
    },

    _startScrollBarChangesTimer : function( horizontal ) {
      var server = rwt.remote.Connection.getInstance();
      if( horizontal && this._horzScrollBar.getHasSelectionListener() ) {
        server.onNextSend( this._sendHorizontalScrolled, this );
      } else {
        if( this._vertScrollBar.getHasSelectionListener() ) {
          server.onNextSend( this._sendVerticalScrolled, this );
        }
        if( this._hasSetDataListener ) {
          server.onNextSend( this._sendSetData, this );
        }
      }
      server.sendDelayed( 400 );
    },

    _sendVerticalScrolled : function() {
      var server = rwt.remote.Connection.getInstance();
      server.getRemoteObject( this._vertScrollBar ).notify( "Selection" );
    },

    _sendHorizontalScrolled : function() {
      var server = rwt.remote.Connection.getInstance();
      server.getRemoteObject( this._horzScrollBar ).notify( "Selection" );
    },

    _sendSetData : function() {
      var server = rwt.remote.Connection.getInstance();
      server.getRemoteObject( this ).notify( "SetData" );
    },

    _sendItemUpdate : function( item, event ) {
      if( !this._inServerResponse() ) {
        if( event.msg === "expanded" || event.msg === "collapsed" ) {
          var expanded = event.msg === "expanded";
          rwt.remote.Connection.getInstance().getRemoteObject( item ).set( "expanded", expanded );
          if( expanded && this._hasExpandListener ) {
            rwt.remote.Connection.getInstance().getRemoteObject( this ).notify( "Expand", {
              "item" : rwt.remote.ObjectRegistry.getId( item )
            } );
          } else if( !expanded && this._hasCollapseListener ) {
            rwt.remote.Connection.getInstance().getRemoteObject( this ).notify( "Collapse", {
              "item" : rwt.remote.ObjectRegistry.getId( item )
            } );
          }
        }
      }
    },

    _sendSelectionEvent : function( item, defaultSelected, detail, index, text ) {
      if(    ( this._hasSelectionListener && !defaultSelected )
          || ( this._hasDefaultSelectionListener && defaultSelected ) )
      {
        var properties = {
          "item" : this._getItemId( item ),
          "detail" : detail,
          "index" : !isNaN( index ) ? index : undefined,
          "text" : text
        };
        if( defaultSelected ) {
          rwt.remote.EventUtil.notifyDefaultSelected( this, properties );
        } else {
          rwt.remote.EventUtil.notifySelected( this, properties );
        }
      }
    },

    _isDoubleClicked : function( event, item ) {
      var result = false;
      var mousedown = event.getType() === "mousedown";
      var leftClick = event.getButton() === "left";
      if( leftClick && mousedown && this.isFocusItem( item ) && this._selectionTimestamp != null ) {
        var stamp = new Date();
        var offset = event.getPageX();
        var timeDiff = rwt.remote.EventUtil.DOUBLE_CLICK_TIME;
        var offsetDiff = 8;
        if (    stamp.getTime() - this._selectionTimestamp.getTime() < timeDiff
             && Math.abs( this._selectionOffsetX - offset ) < offsetDiff )
        {
          result = true;
        }
      }
      if( mousedown && leftClick && !result ) {
        this._selectionTimestamp = new Date();
        this._selectionOffsetX = event.getPageX();
      } else if( mousedown ) {
        this._selectionTimestamp = null;
      }
      return result;
    },

    _getSelectionList : function() {
      var result = [];
      for( var i = 0; i < this._selection.length; i++ ) {
        result.push( this._getItemId( this._selection[ i ] ) );
      }
      return result;
    },

    _getItemId : function( item ) {
      var wm = rwt.remote.WidgetManager.getInstance();
      var result;
      if( item.isCached() ) {
        result = wm.findIdByWidget( item );
      } else {
        var parent = item.getParent();
        if( parent.isRootItem() ) {
          result = wm.findIdByWidget( this );
        } else {
          result = wm.findIdByWidget( parent );
        }
        result += "#" + parent.indexOf( item );
      }
      return result;
    },

    ////////////////////
    // focus & selection

    _singleSelectItem : function( event, item ) {
      if( event.isCtrlPressed() && this.isItemSelected( item ) ) {
        // NOTE: Apparently in SWT this is only supported by Table, not Tree.
        //       No reason not to support it in RAP though.
        this._ctrlSelectItem( item );
      } else {
        this._exclusiveSelectItem( item );
      }
    },

    _multiSelectItem : function( event, item ) {
      if( event instanceof rwt.event.MouseEvent && event.isRightButtonPressed() ) {
        if( !this.isItemSelected( item ) ) {
          this._exclusiveSelectItem( item );
        }
      } else if( event.isCtrlPressed() ) {
        if( event instanceof rwt.event.KeyEvent && item != this._focusItem  ) {
          this.setFocusItem( item );
        } else {
          this._ctrlSelectItem( item );
        }
      } else if( event.isShiftPressed() ) {
        if( this._focusItem != null ) {
          this._shiftSelectItem( item );
        } else {
          this._exclusiveSelectItem( item );
        }
      } else {
        this._exclusiveSelectItem( item );
      }
    },

    _exclusiveSelectItem : function( item ) {
      this.deselectAll();
      this._leadItem = null;
      this._selectItem( item, true );
      this._sendSelectionChange( item );
      this.setFocusItem( item );
    },

    _ctrlSelectItem : function( item ) {
      if( !this.isItemSelected( item ) ) {
        this._selectItem( item, true );
      } else {
        this._deselectItem( item, true );
      }
      this._sendSelectionChange( item );
      this.setFocusItem( item );
    },

    _shiftSelectItem : function( item ) {
      this.deselectAll();
      var currentItem = this._leadItem != null ? this._leadItem : this._focusItem;
      this._leadItem = currentItem;
      var targetItem = item;
      var startIndex = currentItem.getFlatIndex();
      var endIndex = targetItem.getFlatIndex();
      if( startIndex > endIndex ) {
        var temp = currentItem;
        currentItem = targetItem;
        targetItem = temp;
      }
      this._selectItem( currentItem, true );
      while( currentItem !== targetItem ) {
        currentItem = currentItem.getNextItem();
        this._selectItem( currentItem, true );
      }
      this._sendSelectionChange( item );
      this.setFocusItem( item );
    },

    _selectItem : function( item, render ) {
      if( !this.isItemSelected( item ) ) {
        this._selection.push( item );
      }
      if( render ) {
        this._rowContainer.renderItem( item );
      }
    },

    _deselectItem : function( item, render ) {
      if( this.isItemSelected( item ) ) {
        this._selection.splice( this._selection.indexOf( item ), 1 );
      }
      if( render ) {
        this._rowContainer.renderItem( item );
      }
    },

    deselectAll : function() {
      this._checkDisposedItems();
      var oldSelection = this._selection;
      this._selection = [];
      for( var i = 0; i < oldSelection.length; i++ ) {
        this._rowContainer.renderItem( oldSelection[ i ] );
      }
    },

    _toggleCheckSelection : function( item, cell ) {
      if( item.isCached() ) {
        if( isNaN( cell ) ) {
          item.setChecked( !item.isChecked() );
          this._sendItemCheckedChange( item );
        } else if( item.isCellCheckable( cell ) ) {
          item.toggleCellChecked( cell );
          this._sendCellCheckedChange( item, cell );
        }
      }
    },

    _deselectVisibleChildren : function( item ) {
      var currentItem = item.getNextItem();
      var finalItem = item.getNextItem( true );
      while( currentItem !== finalItem ) {
        this._deselectItem( currentItem, false );
        currentItem = currentItem.getNextItem();
      }
    },

    _applyFocused : function( newValue, oldValue ) {
      this.base( arguments, newValue, oldValue );
      this._config.focused = newValue;
      this._scheduleUpdate();
    },

    _applyEnabled : function( newValue, oldValue ) {
      this.base( arguments, newValue, oldValue );
      this._config.enabled = newValue;
      this._scheduleUpdate();
    },

    _checkDisposedItems : function() {
      // NOTE : FocusItem might already been fixed by the server. But since this is not
      //        always the case (depending on the server-side widget), we also do it here.
      if( this._focusItem && this._focusItem.isDisposed() ) {
        this._focusItem = null;
      }
      if( this._leadItem && this._leadItem.isDisposed() ) {
        this._leadItem = null;
      }
      var i = 0;
      while( i < this._selection.length ) {
        if( this._selection[ i ].isDisposed() ) {
          this._deselectItem( this._selection[ i ], false );
        } else {
          i++;
        }
      }
    },

    ////////////////////////////
    // internal layout & theming

    _applyTextColor : function( newValue, oldValue ) {
      this.base( arguments, newValue, oldValue );
      this._config.textColor = newValue;
      this._scheduleUpdate();
    },

    _applyFont : function( newValue, oldValue ) {
      this.base( arguments, newValue, oldValue );
      this._config.font = newValue;
      this._scheduleUpdate();
    },

    _applyBackgroundColor : function( newValue ) {
      this._rowContainer.setBackgroundColor( newValue );
    },

    _applyBackgroundImage : function( newValue ) {
      this._rowContainer.setBackgroundImage( newValue );
    },

    _applyWidth : function( newValue, oldValue ) {
      this.base( arguments, newValue, oldValue );
      this._layoutX();
    },

    _applyHeight : function( newValue, oldValue ) {
      this.base( arguments, newValue, oldValue );
      this._layoutY();
    },

    _applyBorder : function( newValue, oldValue ) {
      this.base( arguments, newValue, oldValue );
      this._layoutX();
      this._layoutY();
    },

    _layoutX : function() {
      var width = this.getWidth() - this.getFrameWidth();
      if( this._header && this._header.getDisplay() ) {
        this._header.setWidth( width );
      }
      if( this._vertScrollBar.getVisibility() ) {
        width -= this._vertScrollBar.getWidth();
        this._vertScrollBar.setLeft( width );
      }
      if( this._footer ) {
        this._footer.setWidth( width );
      }
      this._horzScrollBar.setWidth( width );
      this._rowContainer.setWidth( width );
      this._updateScrollWidth();
    },

    _layoutY : function() {
      var top = 0;
      top += this._header ? this._headerHeight : 0;
      var height = this.getHeight() - this.getFrameHeight();
      height -= this._header ? this._headerHeight : 0;
      height -= this._footer ? this._footerHeight : 0;
      height -= this._horzScrollBar.getVisibility() ? this._horzScrollBar.getHeight() : 0;
      height = Math.max( 0, height );
      if( this._header ) {
        this._header.setHeight( this._headerHeight );
      }
      if( this._footer ) {
        this._footer.setHeight( this._footerHeight );
        this._footer.setTop( top + height );
      }
      if( this._horzScrollBar.getVisibility() ) {
        this._horzScrollBar.setTop( top + height + ( this._footer ? this._footerHeight : 0  ) );
      }
      this._vertScrollBar.setHeight( height + ( this._footer ? this._footerHeight : 0  ) );
      this._vertScrollBar.setTop( top );
      this._rowContainer.setTop( top );
      this._rowContainer.setHeight( height );
      this._scheduleUpdate();
    },

    _getItemWidth : function() {
      var result = 0;
      if( this._config.itemLeft.length > 0 ) {
        var columnCount = Math.max( 1, this._config.columnCount );
        for( var i = 0; i < columnCount; i++ ) {
          result = Math.max( result, this._config.itemLeft[ i ] + this._config.itemWidth[ i ] );
        }
      }
      return result;
    },

    _getRowWidth : function() {
      var width = this._rowContainer.getWidth();
      var result = Math.max( this._getItemWidth(), width );
      return result;
    },

    /////////
    // helper

    _inServerResponse : function() {
      return rwt.remote.EventUtil.getSuspended();
    },

    _isDragSource : function() {
      return this.hasEventListeners( "dragstart" );
    },

    _getTopItem : function() {
      if( this._topItem === null ) {
        this._topItem = this._rootItem.findItemByFlatIndex( this._topItemIndex );
      }
      return this._topItem;
    },

    ////////////////////////
    // Cell tooltip handling

    setEnableCellToolTip : function( value ) {
      if( value ) {
        this._cellToolTip = new rwt.widgets.base.GridCellToolTip( this );
        this._rowContainer.addEventListener( "mousemove", this._onClientAreaMouseMove, this );
        this._rowContainer.setToolTip( this._cellToolTip );
      } else {
        this._rowContainer.removeEventListener( "mousemove", this._onClientAreaMouseMove, this );
        this._rowContainer.setToolTip( null );
        this._cellToolTip.destroy();
        this._cellToolTip = null;
      }
    },

    _onClientAreaMouseMove : function( evt ) {
      if( this._cellToolTip != null ) {
        var itemId = null;
        var columnIndex = -1;
        if( this._rowContainer.getHoverItem() ) {
          var widgetManager = rwt.remote.WidgetManager.getInstance();
          itemId = widgetManager.findIdByWidget( this._rowContainer.getHoverItem() );
          columnIndex = rwt.widgets.util.GridUtil.getColumnByPageX( this, evt.getPageX() );
        }
        this._cellToolTip.setCell( itemId, columnIndex );
      }
    },

    /** Only called by server-side */
    setCellToolTipText : function( text ) {
      if( this._cellToolTip != null ) {
        this._cellToolTip.setText( text );
      }
    }

  }

} );
