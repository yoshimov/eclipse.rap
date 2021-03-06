/*******************************************************************************
 * Copyright (c) 2011, 2012 EclipseSource and others.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *    EclipseSource - initial API and implementation
 ******************************************************************************/

rwt.remote.HandlerRegistry.add( "rwt.widgets.Scale", {

  factory : function( properties ) {
    var isHorizontal = properties.style.indexOf( "HORIZONTAL" ) != -1;
    var result = new rwt.widgets.Scale( isHorizontal );
    rwt.remote.HandlerUtil.addStatesForStyles( result, properties.style );
    result.setUserData( "isControl", true );
    rwt.remote.HandlerUtil.setParent( result, properties.parent );
    return result;
  },

  destructor : rwt.remote.HandlerUtil.getControlDestructor(),

  getDestroyableChildren : rwt.remote.HandlerUtil.getDestroyableChildrenFinder(),

  properties : rwt.remote.HandlerUtil.extendControlProperties( [
    "minimum",
    "maximum",
    "selection",
    "increment",
    "pageIncrement"
  ] ),

  propertyHandler : rwt.remote.HandlerUtil.extendControlPropertyHandler( {} ),

  listeners : rwt.remote.HandlerUtil.extendControlListeners( [
    "Selection"
  ] ),

  listenerHandler : rwt.remote.HandlerUtil.extendControlListenerHandler( {} )

} );
