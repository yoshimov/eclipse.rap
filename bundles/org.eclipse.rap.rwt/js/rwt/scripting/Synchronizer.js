/*******************************************************************************
 * Copyright (c) 2012, 2013 EclipseSource and others.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *    EclipseSource - initial API and implementation
 ******************************************************************************/

(function(){

rwt.qx.Class.createNamespace( "rwt.scripting", {} );

rwt.scripting.Synchronizer = function( widget ) {
  widget.addEventListener( "changeBackgroundColor", this._onChangeBackgroundColor, this );
  widget.addEventListener( "changeTextColor", this._onChangeTextColor, this );
};

rwt.scripting.Synchronizer._ENABLE_KEY = "rwt.scripting.Synchronizer.ENABLED";

rwt.scripting.Synchronizer.enable = function( widget ) {
  widget.setUserData( this._ENABLE_KEY, true );
};

rwt.scripting.Synchronizer.disable = function( widget ) {
  widget.setUserData( this._ENABLE_KEY, false );
};

rwt.scripting.Synchronizer.prototype = {

  _onChangeBackgroundColor : function( event ) {
    var widget = event.getTarget();
    var color = widget.__user$backgroundColor;
    this._sync( widget, "background", this._convertColor( color ) );
  },

  _onChangeTextColor : function( event ) {
    var widget = event.getTarget();
    var color = widget.__user$textColor;
    this._sync( widget, "foreground", this._convertColor( color ) );
  },

  _sync : function( widget, property, value ) {
    if( widget.getUserData( rwt.scripting.Synchronizer._ENABLE_KEY ) ) {
      rap.getRemoteObject( widget ).set( property, value );
    }
  },

  _convertColor : function( color ) {
    var result = null;
    if( color != null ) {
      result = rwt.util.Colors.stringToRgb( color );
    }
    return result;
  }

};


}());
