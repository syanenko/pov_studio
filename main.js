//
// Run: sudo /opt/lampp/manager-linux-x64.run
//
// TODO
//
// - XR mode - model move/scale
// - Scene tweaking
// - Extend materials library
// - Pass camera params to 'model.ini'
// - Server-side previw rendering (?)
// - Help in about
// - Check selector shifting
// - Materials: fix black line in matcaps 
// - Materials: add gems
// - vertexColors + flatShading (?)
//
//---- model.ini --------------------------------------------------------------------------------
//
// POV-Ray 'mesh2' file
//
// Prodiced by POV-Ray studio
//
// URL: https://povlab.yesbird.online/studio
// Email: yesbird65@gmail.com
//
// Source: teapot.glb
// Time:   11.10.2025 1:29
//
// -- How to use ------------------------------------------------------------
// 
// 1. Install POV-Ray: https://povray.org.
//
// 2. Download and unzip studio template:
//    https://povlab.yesbird.online/studio/data/download/studio.zip.
//
// 3. Save this file in the same directory as 'studio.pov' from 'studio.zip'.
//
// 4. Render 'studio.pov'.
//
// 5. Adjust rendering parameters in 'studio.pov' according your needs.
//
// --------------------------------------------------------------------------

import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { VertexNormalsHelper } from 'three/addons/helpers/VertexNormalsHelper.js';
import { AsyncLoader } from './modules/AsyncLoader.js';
import { GLTFExporter } from './modules/GLTFExporter.js';
import { POVExporter } from './modules/POVExporter.js';
import { POVAExporter } from './modules/POVAExporter.js';

import { VRButtonIcon } from './modules/webxr/VRButtonIcon.js';
import { XRControllerModelFactory } from './modules/webxr/XRControllerModelFactory.js';

const DEFAULT_MODEL = 'teapot.glb';
//const DEFAULT_MODEL = 'ring.glb';
//const DEFAULT_MODEL = 'cube.fbx';
//const DEFAULT_MODEL = 'Ingenuity_Mars_Helicopter.glb';
let DEFAULT_MODEL_PATH = './data/models/' + DEFAULT_MODEL;

const PATH_MATCAPS = './data/materials/';
const DEFAULT_POVMAT = "M_light_tan_dull";
const DEFAULT_SELECTED = "M_yellow_green_gloss";

let container;
let camera, scene, renderer;
const FOV = 50;
let ocontrols;

 // XR
let beam;
const beam_color = 0xffffff;
const beam_hilight_color = 0x222222;
let controller;
let cpmatrix;
let vrButton;

let bb, bs;
let material, model = [];
let group;
let matcap;
let povmat = DEFAULT_POVMAT; 
let curMatcapBut;

let cb_VertexColors;
let cb_DisplayAxis;
let cb_DisplayFloor;
let cb_DisplayFloorStatus;
let cb_DisplayNormals;

let fill = false;
let sourceFile = DEFAULT_MODEL;

let selBlocked = false;

//
// Init
//
async function init() {
  camera = new THREE.PerspectiveCamera( FOV, window.innerWidth / window.innerHeight, 0.1, 8000 );
  camera.position.set( 0, 2, 3 );

  scene = new THREE.Scene();
  scene.add( camera );

  const ambientLight = new THREE.AmbientLight(0xffffff, 2.5); // White light, 50% intensity
  scene.add(ambientLight);

  window.addEventListener( 'resize', onWindowResize );

  renderer = new THREE.WebGLRenderer({alpha: true, antialias: true});
  renderer.setSize( window.innerWidth, window.innerHeight);
  renderer.setPixelRatio( window.devicePixelRatio );
  container = document.getElementById("container");
  container.appendChild( renderer.domElement );

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;

  // Init orbit controlls
  ocontrols = new OrbitControls( camera, renderer.domElement );
  ocontrols.enablePan = true;

  // Settings
  cb_VertexColors = document.getElementById("vertex_colors");
  cb_DisplayAxis = document.getElementById("display_axis");
  cb_DisplayFloor = document.getElementById("display_floor");
  cb_DisplayNormals = document.getElementById("display_normals");

  // Listen for uploaded file name
  const fileInput = document.getElementById('model');
  fileInput.addEventListener('change', (event) => {
    const fileList = event.target.files;
    if (fileList.length > 0) {
      const firstFile = fileList[0];
      sourceFile = firstFile.name;
    }
  });

  // Load default model
  group = new THREE.Group();
  await createMaterial();
  await loadModel(DEFAULT_MODEL_PATH);
  curMatcapBut = document.getElementById(DEFAULT_SELECTED);
  await selectMat(curMatcapBut);

  // XR
  vrButton = VRButtonIcon.createButton( renderer ); 

  renderer.xr.enabled = true;
  renderer.xr.setReferenceSpaceType( 'local' );
  renderer.xr.setFramebufferScaleFactor( 4.0 );

  let cpos = new THREE.Vector3();
  let crot = new THREE.Quaternion();

  let mpos = new THREE.Vector3();
  let mrot = new THREE.Quaternion();

  // XR start
  renderer.xr.addEventListener( 'sessionstart', function ( event ) {
    renderer.setClearColor(new THREE.Color(0x000), 1);

    cpmatrix = camera.projectionMatrix.clone();
    cpos.copy(camera.position);
    crot.copy(camera.quaternion);

    // Put model into view
    group.position.set(0, -bs.radius / 8, -bs.radius * 2);
    // group.scale.set(1, 1, 1);

    // Switch off floor
    cb_DisplayFloorStatus = cb_DisplayFloor.checked;
    if(cb_DisplayFloorStatus)
      cb_DisplayFloor.click();

    // gui_mesh.visible = true;
  });

  // XR end
  renderer.xr.addEventListener( 'sessionend', function ( event ) {
    renderer.setClearColor(new THREE.Color(0x000), 0);

    camera.projectionMatrix.copy(cpmatrix);
    camera.position.copy(cpos);
    camera.quaternion.copy(crot);
    camera.fov = FOV;

    // Restore model's scale and position
    group.position.set(0, 0, 0);
    // group.scale.set(1, 1, 1);

    // Restore floor
    if(cb_DisplayFloorStatus)
      cb_DisplayFloor.click();

    onWindowResize();
    //gui_mesh.visible = false;
  });

  await initController();

  // Defaults
  // cb_DisplayAxis.click();
  // cb_DisplayFloor.click();
  // document.getElementById("flat").click();
}

//
// Enter XR
//
function enterXR() {
  vrButton.click();
}
window.enterXR = enterXR;

//
// Get geometry
// 
function getMeshes(obj) {
  let meshes = [];
  if(obj.scene)
    obj = scene;
  obj.traverse(e =>{
    if(e.isMesh) {
        meshes.push(e);
    }})
  return meshes;
}

// Load model
async function loadModel(path)
{
  if(!path) {
    console.error('No model path specified');
    return;
  }

  displayNormals(false);

  // DEBUG: group
  for(let i=0; i<model.length; i++) {
    group.remove(model[i]);
  }
  scene.remove(group);

  // Model cleanup
  for(let i=0; i<model.length; i++) {
    if (typeof model[i]) {
      scene.remove( model[i] );
      model[i].geometry.dispose();
      model[i].material.dispose();
    }
  }

  // Scene  cleanup
  scene.children.forEach(object => {
    if (object.geometry) {
        object.geometry.dispose();
    }
    if (object.material) {
        // Handle single material or array of materials
        if (Array.isArray(object.material)) {
            object.material.forEach(material => material.dispose());
        } else {
            object.material.dispose();
        }
    }
  });
  scene.clear();
  console.log(scene);

  model.length = 0;
  renderer.renderLists.dispose();
  
  // Load meshes
  let sceneGLTF;
  let meshes = [];
  const ext = path.slice(-4);
  let gltf = false;
  switch(ext)
  {
    case '.obj':
    case '.OBJ': meshes = getMeshes((await AsyncLoader.loadOBJAsync(path)));
                 break;
    case '.stl':
    case '.STL': let geom = await AsyncLoader.loadSTLAsync(path);
                 let mesh = new THREE.Mesh( geom, material );
                 meshes.push(mesh);  // Geometry only
                 break;
    case '.fbx':
    case '.FBX': meshes = getMeshes((await AsyncLoader.loadFBXAsync(path)));
                 break;
    case '.glb': 
    case '.GLB':
    case 'gltf':
    case 'GLTF': sceneGLTF = (await AsyncLoader.loadGLTFAsync(path)).scene;
                 meshes = getMeshes(sceneGLTF);
                 gltf = true;
                 break;

    default: console.error("Unknown file extention: '" + ext + "'");
  }
  
  bb = new THREE.Box3();
  let vcount = 0, fcount = 0;
  for (let i = 0; i < meshes.length; i++) {
    meshes[i].geometry.deleteAttribute( 'normal' );
    meshes[i].geometry = BufferGeometryUtils.mergeVertices(meshes[i].geometry);
    meshes[i].geometry.computeVertexNormals();
    meshes[i].material.dispose();
    meshes[i].material = material.clone();
    meshes[i].material.needsUpdate = true;
    meshes[i].name = "part" + (i + 1);

    if(!meshes[i].userData.povray)
      meshes[i].userData.povray = {};

    if(meshes[i].userData.povray.material == undefined) {
      meshes[i].userData.povray.material = povmat;
    } else { // Load materials
      if(meshes[i].material.matcap)
        meshes[i].material.matcap.dispose();

      let mc, path = PATH_MATCAPS + meshes[i].userData.povray.material + ".png";
      try {
        mc = await AsyncLoader.loadTextureAsync(path);
      } catch(err) {}
      
      if(mc) {
        meshes[i].material.matcap = mc;
        meshes[i].material.matcap.colorSpace = THREE.SRGBColorSpace;
        meshes[i].material.matcap.needsUpdate = true;
      }
    }

    model.push(meshes[i]);
    if(!gltf)
      scene.add(meshes[i]);

    bb.expandByObject(meshes[i]);

    vcount += model[i].geometry.index.count;
    fcount += model[i].geometry.index.count / 3;
  }
  
  if(gltf)
    scene.add(sceneGLTF);

  // DEBUG: group
  for(let i=0; i<model.length; i++) {
    group.add(model[i]);
  }
  scene.add(group);

  console.log(scene); // DEBUG
  //console.log(model.geometry.attributes);
  //console.log(model.geometry);
  //console.log(model.geometry.getAttribute( 'position' ));

  // Display stat
  document.getElementById("stat").innerHTML = meshes.length + " meshes / " + vcount + " points / " + fcount + " faces";

  // Set view
  bs = new THREE.Sphere();
  bb.getBoundingSphere(bs);

  ocontrols.reset();
  ocontrols.target.copy(bs.center);
  camera.position.set(bs.center.x,
                      bs.center.y,
                      bs.center.z + bs.radius * 2.2);

  axis_len = bs.radius * 2.5;
  displayAxis(false);
  displayAxis(cb_DisplayAxis.checked);

  normals_len = bs.radius / 30;
  displayNormals(cb_DisplayNormals.checked);

  displayFloor(cb_DisplayFloor.checked);
  ocontrols.update();
}
window.loadModel = loadModel;

//
// Creat material
//
async function createMaterial() {
  if( material != undefined) {
    if(material.matcap)
      material.matcap.dispose();
    material.dispose();
  }

/* VertexColors
  if(cb_VertexColors.checked) {
    material = new THREE.MeshStandardMaterial( {side: THREE.DoubleSide, vertexColors: true} ); }
  else if(shading == "wireframe") {
    material = new THREE.MeshStandardMaterial( {side: THREE.DoubleSide, wireframe: true} ); }
  else {
    let mc = await AsyncLoader.loadTextureAsync(PATH_MATCAPS + matcap + "_mcap.png");
    mc.colorSpace = THREE.SRGBColorSpace;
    material = new THREE.MeshMatcapMaterial( {matcap: mc, side: THREE.DoubleSide} );
  }
*/

  matcap = await AsyncLoader.loadTextureAsync(PATH_MATCAPS + povmat + ".png");
  matcap.colorSpace = THREE.SRGBColorSpace;
  material = new THREE.MeshMatcapMaterial( {matcap: matcap, side: THREE.DoubleSide} );

  for(let i=0; i<model.length; i++) {
      model[i].material.matcap.dispose();
      model[i].material.dispose();
      model[i].material = material.clone();
      model[i].material.matcap = material.matcap.clone();
      model[i].material.matcap.needsUpdate = true;
      model[i].material.needsUpdate = true;
  }
}
window.createMaterial = createMaterial;

//
// Update shading
//
async function updateShading(checked) {
  material.flatShading = checked;
  material.needsUpdate = true;

  for(let i=0; i<model.length; i++) {
    model[i].material.flatShading = checked;
    model[i].material.needsUpdate = true;
  }
}
window.updateShading = updateShading;

//
// Update vertex colors
//
async function updateVertexColors(checked) {
  material.vertexColors = checked;
  material.needsUpdate = true;
  for(let i=0; i<model.length; i++) {
    model[i].material.vertexColors = checked;
    model[i].material.needsUpdate = true;
  }
}
window.updateVertexColors = updateVertexColors;

//
// Select material
//
async function selectMat(button) {
  if(curMatcapBut)
    curMatcapBut.style.outline = "1px solid #fff";

  button.style.outline = "3px solid #ff9127";
  button.style.outlineOffset = "-1px";
  curMatcapBut = button;

  povmat = button.id;
  matcap = await AsyncLoader.loadTextureAsync(PATH_MATCAPS + povmat + ".png");
  if(fill) {
    for(let i=0; i<model.length; i++) {
      if(model[i].material.matcap)
        model[i].material.matcap.dispose();

      model[i].material.matcap = matcap;
      model[i].material.matcap.colorSpace = THREE.SRGBColorSpace;
      model[i].material.matcap.needsUpdate = true;

      if(!model[i].userData.povray)
        model[i].userData.povray = {};

      model[i].userData.povray.material = povmat;
    }
  }
}
window.selectMat = selectMat;

//
// Display normals
//
let normals_helpers = [];
let normals_len = 0.1;
async function displayNormals(checked) {
  
  if(checked) {
    for(let i=0; i<model.length; i++) {
      let nh = new VertexNormalsHelper( model[i], normals_len )
      normals_helpers.push(nh);
      scene.add( nh ); }
  }
  else {
    for(let i=0; i<model.length; i++) {
      if(normals_helpers[i]) {
        scene.remove( normals_helpers[i] );
        normals_helpers[i].dispose();
      }
    }
    normals_helpers.length = 0;
  }
}
window.displayNormals = displayNormals;

//
// Display axis
//
let arrow_helper_x;
let arrow_helper_y;
let arrow_helper_z;
let axis_o = new THREE.Vector3(0,0,0);
let axis_x = new THREE.Vector3(1,0,0);
let axis_y = new THREE.Vector3(0,1,0);
let axis_z = new THREE.Vector3(0,0,1);
let axis_len = 1;
async function displayAxis(checked) {
  if(checked) {
    arrow_helper_x = new THREE.ArrowHelper(axis_x, axis_o, axis_len, 'crimson');
    arrow_helper_y = new THREE.ArrowHelper(axis_y, axis_o, axis_len, 'green');
    arrow_helper_z = new THREE.ArrowHelper(axis_z, axis_o, axis_len, 'royalblue');
    scene.add( arrow_helper_x );
    scene.add( arrow_helper_y );
    scene.add( arrow_helper_z );
  }
  else {
   if(arrow_helper_x) {
    scene.remove( arrow_helper_x );
    arrow_helper_x.dispose(); }

   if(arrow_helper_y) {
    scene.remove( arrow_helper_y );
    arrow_helper_y.dispose(); }

   if(arrow_helper_z) {
    scene.remove( arrow_helper_z );
    arrow_helper_z.dispose(); }
  }
}
window.displayAxis = displayAxis;

//
// Display axis
//
let grid_helper;
async function displayFloor(checked) {
  if(checked) {
    grid_helper = new THREE.GridHelper( axis_len, 20,
                                        new THREE.Color().setHex( 0x888888 ),
                                        new THREE.Color().setHex( 0x888888 ) );
    scene.add( grid_helper );
  }
  else {
    if(grid_helper) {
      scene.remove( grid_helper );
      grid_helper.dispose();
    }
  }
}
window.displayFloor = displayFloor;

//
// Rotation
//
async function switchRotation(checked) {
  ocontrols.autoRotate = checked;
}
window.switchRotation = switchRotation;

//
// Switch normals
//
async function setFill(checked) {
  fill = checked;
}
window.setFill = setFill;

//
// Init controller
//
async function initController()
{

  // Init XR controller
  controller = renderer.xr.getController( 0 );
  // Grip 
  const controllerModelFactory = new XRControllerModelFactory();
  const controllerGrip1 = renderer.xr.getControllerGrip( 0 );
  controllerGrip1.add( controllerModelFactory.createControllerModel( controllerGrip1 ) );
  scene.add( controllerGrip1 );

  // Beam
  const beam_geom = new THREE.CylinderGeometry( 0.003, 0.005, 1, 4, 1, true);
  const textureLoader = new THREE.TextureLoader();
  const alpha = textureLoader.load('./modules/webxr/beam_alpha.png');
  const beam_mat = new THREE.MeshStandardMaterial({ transparent: true,
                                                    alphaMap:alpha,
                                                    lightMapIntensity:0,
                                                    opacity: 0.8,
                                                    color: beam_color,
                                                    // emissive: 0xffffff
                                                    alphaTest:0.01
                                                    });
  beam = new THREE.Mesh(beam_geom, beam_mat);
  beam.name = 'beam';
  beam.receiveShadow = false;

  // Alight beam to grip
  beam.rotateX(Math.PI / 2);
  beam.translateY(-0.5);
  controller.add(beam);
  scene.add( controller );

  // Hilight controller
  const light = new THREE.PointLight( 0xffffff, 2, 1, 0);
  light.position.set( 0, 0, 0 );
  scene.add( light );

  controller.addEventListener( 'selectstart', onSelectStart );
  controller.addEventListener( 'selectend', onSelectEnd );
}

//
//  Controller events
//
function onSelectStart( event )
{
  // Hilight beam
  const controller = event.target;
  let beam = controller.getObjectByName( 'beam' );
  beam.material.color.set(beam_hilight_color);
  beam.material.emissive.g = 0.5;
  
  rotX = controller.rotation.x;
  rotY = controller.rotation.y;
  rotate = true;
}

function onSelectEnd( event )
{
  // Unhighlight beam
  const controller = event.target;
  beam = controller.getObjectByName( 'beam' );
  beam.material.color.set(beam_color);
  beam.material.emissive.g = 0;

  rotate = false;
}

// Resize
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize( window.innerWidth, window.innerHeight );
}

// Download
const link = document.createElement( 'a' );
link.style.display = 'none';
document.body.appendChild( link );

// Save
function save( blob, filename ) {
  link.href = URL.createObjectURL( blob );
  link.download = filename;
  link.click();
}

// Save string
function saveString( text, filename ) {
  save( new Blob( [ text ], { type: 'text/plain' } ), filename );
}

// download
function download(type) {
  if(type == "obj") { // OBJ
    const exporter = new OBJExporter();
    const result = exporter.parse( surface );
    saveString( result, 'surface.obj' );
  } else if(type == "glb") { // GLB
    const exporter = new GLTFExporter();
    const options = {
        binary: true,
    };
    exporter.parse(scene, function (result) {
      const blob = new Blob([result], { type: 'application/octet-stream' });
      save( blob, 'model.glb' );
    }, function (error) {
        console.error('An error happened during GLB export:', error);
    }, options);
  } else if(type == "gltf") { // GLTF
    const exporter = new GLTFExporter();
    const options = {
        binary: false,
    };
    exporter.parse(scene, function (result) {
      const json = JSON.stringify(result, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      save( blob, 'model.gltf' );
    }, function (error) {
       console.error('An error happened during GLTF export:', error);
    }, options);
  } else if(type == "pov") { // POV
    let exporter;
    if(document.getElementById("export_arrays").checked)
      exporter = new POVAExporter();
    else
      exporter = new POVExporter();

    const result = exporter.parse( scene, material.flatShading, material.vertexColors, bb, bs, sourceFile );
    saveString( result, 'model.inc' );
  }
}
window.download = download;

//
// Selector
//
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let io = null;

// Block / unblock
function blockSelector(block) {
  selBlocked = block;
}
window.blockSelector = blockSelector;

function onMouseDown(event) {
  if(selBlocked) return;

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  mouse.y += 0.12; // DEBUG: Why ?
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(model, false);

  if (intersects.length > 0) {
    io = intersects[0].object;
    for (let i=0; i<intersects.length; i++) {
      io.material.matcap.dispose();
      io.material.matcap = matcap;
      io.material.matcap.colorSpace = THREE.SRGBColorSpace;
      io.material.matcap.needsUpdate = true;
      if(!io.userData.povray)
        io.userData.povray = {}
      io.userData.povray.material = povmat;
    }
  } else {
      // for (let i=0; i<model.length; i++) {
      // model[i].material.color.setHex(0xffffff);
      // }
  }
}
document.addEventListener('mousedown', onMouseDown, false);

//
// Animate
//
function animate() {
  renderer.setAnimationLoop( render );
}

//
// Render
//
function render() {
  ocontrols.update();
  renderer.render(scene, camera);
}

//
// Run
//
await init();
animate();
