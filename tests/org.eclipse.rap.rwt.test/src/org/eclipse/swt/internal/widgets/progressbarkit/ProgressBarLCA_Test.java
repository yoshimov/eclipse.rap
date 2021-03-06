/*******************************************************************************
 * Copyright (c) 2009, 2013 EclipseSource and others.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *    EclipseSource - initial API and implementation
 ******************************************************************************/
package org.eclipse.swt.internal.widgets.progressbarkit;

import static org.eclipse.rap.rwt.internal.protocol.RemoteObjectFactory.getRemoteObject;
import static org.eclipse.rap.rwt.lifecycle.WidgetUtil.getId;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.verify;

import java.io.IOException;
import java.util.Arrays;

import org.eclipse.rap.json.JsonObject;
import org.eclipse.rap.rwt.internal.remote.RemoteObjectRegistry;
import org.eclipse.rap.rwt.lifecycle.WidgetAdapter;
import org.eclipse.rap.rwt.lifecycle.WidgetUtil;
import org.eclipse.rap.rwt.remote.OperationHandler;
import org.eclipse.rap.rwt.testfixture.Fixture;
import org.eclipse.rap.rwt.testfixture.Message;
import org.eclipse.rap.rwt.testfixture.Message.CreateOperation;
import org.eclipse.swt.SWT;
import org.eclipse.swt.internal.widgets.controlkit.ControlLCATestUtil;
import org.eclipse.swt.widgets.Display;
import org.eclipse.swt.widgets.ProgressBar;
import org.eclipse.swt.widgets.Shell;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;


public class ProgressBarLCA_Test {

  private Shell shell;
  private Display display;
  private ProgressBar progressBar;
  private ProgressBarLCA lca;

  @Before
  public void setUp() {
    Fixture.setUp();
    display = new Display();
    shell = new Shell( display );
    progressBar = new ProgressBar( shell, SWT.NONE );
    lca = new ProgressBarLCA();
    Fixture.fakeNewRequest();
  }

  @After
  public void tearDown() {
    Fixture.tearDown();
  }

  @Test
  public void testControlListeners() throws IOException {
    ControlLCATestUtil.testActivateListener( progressBar );
    ControlLCATestUtil.testMouseListener( progressBar );
    ControlLCATestUtil.testKeyListener( progressBar );
    ControlLCATestUtil.testTraverseListener( progressBar );
    ControlLCATestUtil.testMenuDetectListener( progressBar );
    ControlLCATestUtil.testHelpListener( progressBar );
  }

  @Test
  public void testPreserveValues() {
    Fixture.preserveWidgets();
    WidgetAdapter adapter = WidgetUtil.getAdapter( progressBar );
    Object preserved = adapter.getPreserved( ProgressBarLCA.PROP_STATE );
    assertNull( preserved );
  }

  @Test
  public void testRenderCreate() throws IOException {
    lca.renderInitialization( progressBar );

    Message message = Fixture.getProtocolMessage();
    CreateOperation operation = message.findCreateOperation( progressBar );
    assertEquals( "rwt.widgets.ProgressBar", operation.getType() );
  }

  @Test
  public void testRenderInitialization_setsOperationHandler() throws IOException {
    String id = getId( progressBar );
    lca.renderInitialization( progressBar );

    OperationHandler handler = RemoteObjectRegistry.getInstance().get( id ).getHandler();
    assertTrue( handler instanceof ProgressBarOperationHandler );
  }

  @Test
  public void testReadData_usesOperationHandler() {
    ProgressBarOperationHandler handler = spy( new ProgressBarOperationHandler( progressBar ) );
    getRemoteObject( getId( progressBar ) ).setHandler( handler );

    Fixture.fakeNotifyOperation( getId( progressBar ), "Help", new JsonObject() );
    lca.readData( progressBar );

    verify( handler ).handleNotifyHelp( progressBar, new JsonObject() );
  }

  @Test
  public void testRenderParent() throws IOException {
    lca.renderInitialization( progressBar );

    Message message = Fixture.getProtocolMessage();
    CreateOperation operation = message.findCreateOperation( progressBar );
    assertEquals( WidgetUtil.getId( progressBar.getParent() ), operation.getParent() );
  }

  @Test
  public void testRenderCreateWithVerticalAndIndeterminate() throws IOException {
    progressBar = new ProgressBar( shell, SWT.VERTICAL | SWT.INDETERMINATE );

    lca.renderInitialization( progressBar );

    Message message = Fixture.getProtocolMessage();
    CreateOperation operation = message.findCreateOperation( progressBar );
    Object[] styles = operation.getStyles();
    assertTrue( Arrays.asList( styles ).contains( "VERTICAL" ) );
    assertTrue( Arrays.asList( styles ).contains( "INDETERMINATE" ) );
  }

  @Test
  public void testRenderInitialMinimum() throws IOException {
    lca.render( progressBar );

    Message message = Fixture.getProtocolMessage();
    CreateOperation operation = message.findCreateOperation( progressBar );
    assertTrue( operation.getPropertyNames().indexOf( "minimum" ) == -1 );
  }

  @Test
  public void testRenderMinimum() throws IOException {
    progressBar.setMinimum( 10 );
    lca.renderChanges( progressBar );

    Message message = Fixture.getProtocolMessage();
    assertEquals( 10, message.findSetProperty( progressBar, "minimum" ).asInt() );
  }

  @Test
  public void testRenderMinimumUnchanged() throws IOException {
    Fixture.markInitialized( display );
    Fixture.markInitialized( progressBar );

    progressBar.setMinimum( 10 );
    Fixture.preserveWidgets();
    lca.renderChanges( progressBar );

    Message message = Fixture.getProtocolMessage();
    assertNull( message.findSetOperation( progressBar, "minimum" ) );
  }

  @Test
  public void testRenderInitialMaxmum() throws IOException {
    lca.render( progressBar );

    Message message = Fixture.getProtocolMessage();
    CreateOperation operation = message.findCreateOperation( progressBar );
    assertTrue( operation.getPropertyNames().indexOf( "maximum" ) == -1 );
  }

  @Test
  public void testRenderMaxmum() throws IOException {
    progressBar.setMaximum( 10 );
    lca.renderChanges( progressBar );

    Message message = Fixture.getProtocolMessage();
    assertEquals( 10, message.findSetProperty( progressBar, "maximum" ).asInt() );
  }

  @Test
  public void testRenderMaxmumUnchanged() throws IOException {
    Fixture.markInitialized( display );
    Fixture.markInitialized( progressBar );

    progressBar.setMaximum( 10 );
    Fixture.preserveWidgets();
    lca.renderChanges( progressBar );

    Message message = Fixture.getProtocolMessage();
    assertNull( message.findSetOperation( progressBar, "maximum" ) );
  }

  @Test
  public void testRenderInitialSelection() throws IOException {
    lca.render( progressBar );

    Message message = Fixture.getProtocolMessage();
    CreateOperation operation = message.findCreateOperation( progressBar );
    assertTrue( operation.getPropertyNames().indexOf( "selection" ) == -1 );
  }

  @Test
  public void testRenderSelection() throws IOException {
    progressBar.setSelection( 10 );
    lca.renderChanges( progressBar );

    Message message = Fixture.getProtocolMessage();
    assertEquals( 10, message.findSetProperty( progressBar, "selection" ).asInt() );
  }

  @Test
  public void testRenderSelectionUnchanged() throws IOException {
    Fixture.markInitialized( display );
    Fixture.markInitialized( progressBar );

    progressBar.setSelection( 10 );
    Fixture.preserveWidgets();
    lca.renderChanges( progressBar );

    Message message = Fixture.getProtocolMessage();
    assertNull( message.findSetOperation( progressBar, "selection" ) );
  }

  @Test
  public void testRenderInitialState() throws IOException {
    lca.render( progressBar );

    Message message = Fixture.getProtocolMessage();
    CreateOperation operation = message.findCreateOperation( progressBar );
    assertTrue( operation.getPropertyNames().indexOf( "state" ) == -1 );
  }

  @Test
  public void testRenderState() throws IOException {
    progressBar.setState( SWT.ERROR );
    lca.renderChanges( progressBar );

    Message message = Fixture.getProtocolMessage();
    assertEquals( "error", message.findSetProperty( progressBar, "state" ).asString() );
  }

  @Test
  public void testRenderStateUnchanged() throws IOException {
    Fixture.markInitialized( display );
    Fixture.markInitialized( progressBar );

    progressBar.setState( SWT.ERROR );
    Fixture.preserveWidgets();
    lca.renderChanges( progressBar );

    Message message = Fixture.getProtocolMessage();
    assertNull( message.findSetOperation( progressBar, "state" ) );
  }

}
