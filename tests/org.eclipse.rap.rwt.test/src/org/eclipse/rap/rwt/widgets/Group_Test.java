/*******************************************************************************
 * Copyright (c) 2002-2006 Innoopract Informationssysteme GmbH.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 * 
 * Contributors:
 *     Innoopract Informationssysteme GmbH - initial API and implementation
 ******************************************************************************/

package org.eclipse.rap.rwt.widgets;

import junit.framework.TestCase;
import org.eclipse.rap.rwt.RWT;
import org.eclipse.rap.rwt.RWTFixture;


public class Group_Test extends TestCase {
  
  protected void setUp() throws Exception {
    RWTFixture.setUp();
  }

  protected void tearDown() throws Exception {
    RWTFixture.tearDown();
  }

  public void testText() {
    Display display = new Display();
    Shell shell = new Shell( display , RWT.NONE );
    Group group = new Group( shell, RWT.NONE );
    assertEquals( "", group.getText() );
    group.setText( "xyz" );
    assertEquals( "xyz", group.getText() );
    try {
      group.setText( null );
      fail( "Must not allow to set null-text." );
    } catch( NullPointerException e ) {
      // expected
    }
  }
}
