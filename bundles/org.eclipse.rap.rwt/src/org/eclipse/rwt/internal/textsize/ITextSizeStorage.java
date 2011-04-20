/*******************************************************************************
 * Copyright (c) 2007, 2010 Innoopract Informationssysteme GmbH.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     Innoopract Informationssysteme GmbH - initial API and implementation
 *     EclipseSource - ongoing development
 ******************************************************************************/
package org.eclipse.rwt.internal.textsize;

import org.eclipse.swt.graphics.*;


/**
 * TODO [fappel]: Documentation, move to API package
 */
public interface ITextSizeStorage {
  
  FontData[] getFontList();
  void storeFont( FontData fontData );
  
  Point lookupTextSize( Integer key );
  void storeTextSize( Integer key, Point size );
}