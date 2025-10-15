//
// Run: sudo /opt/lampp/manager-linux-x64.run
//
// -- TODO
// - Zoom in XR
// - Help in about
// - Check selector shifting (?)
//
// -- Bugs
// - Unblock selector on Cancel dialogs
// - XR: click, drug out of the window - sticks to model (!)
// - gearbox.fbx on render
//
import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { VertexNormalsHelper } from 'three/addons/helpers/VertexNormalsHelper.js';
import { AsyncLoader } from './modules/AsyncLoader.js';
import { GLTFExporter } from './modules/GLTFExporter.js';
import { POVExporter } from './modules/POVExporter.js';
import { POVAExporter } from './modules/POVAExporter.js';
import { initXR } from './modules/XR.js';

const DEFAULT_MODEL = 'teapot.glb';
//const DEFAULT_MODEL = 'ring.glb';
//const DEFAULT_MODEL = 'cube_uv.fbx';
//const DEFAULT_MODEL = 'viking_lander.glb';
//const DEFAULT_MODEL = 'Ingenuity_Mars_Helicopter.glb';
let DEFAULT_MODEL_PATH = './data/models/' + DEFAULT_MODEL;

const PATH_MATCAPS = './data/materials/';
const DEFAULT_POVMAT = "M_light_tan_dull";
const DEFAULT_SELECTED = "M_yellow_green_gloss";

let container;
// let camera, scene, renderer;
const FOV = 50;
let ocontrols;

// XR
const rotTH = 0.005;
const rotK = 3;
window.rotX = window.rotY = 0;
window.rotate = false;

let material, model = [];
let matcap;
let povmat = DEFAULT_POVMAT; 
let curMatcapBut;

let cb_VertexColors;
let cb_DisplayAxis;
let cb_DisplayFloor;
let cb_DisplayNormals;

let fill = false;
let sourceFile = DEFAULT_MODEL;

let selBlocked = false;

//
// Init
//
async function init() {
  window.camera = new THREE.PerspectiveCamera( FOV, window.innerWidth / window.innerHeight, 0.1, 8000 );
  camera.position.set( 0, 2, 3 );

  window.scene = new THREE.Scene();
  scene.add( camera );

  const ambientLight = new THREE.AmbientLight(0xffffff, 2.5); // White light, 50% intensity
  scene.add(ambientLight);

  window.addEventListener( 'resize', onWindowResize );

  window.renderer = new THREE.WebGLRenderer({alpha: true, antialias: true});
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

  window.bb = new THREE.Box3();
  window.bs = new THREE.Sphere();
  window.group = new THREE.Group();

  await createMaterial();
  await loadModel(DEFAULT_MODEL_PATH);
  curMatcapBut = document.getElementById(DEFAULT_SELECTED);
  await selectMat(curMatcapBut);
  await initXR(scene, camera, renderer);

  // GUI defaults
  // cb_DisplayAxis.click();
  cb_DisplayFloor.click();
  // document.getElementById("flat").click();
  // document.getElementById("reverse_vertices").click();
  // document.getElementById("export_arrays").click();
}

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
  sourceFile = path;
  displayNormals(false);

  // Clear up model group
  group.traverse(obj => {
    if (obj.geometry) {
        obj.geometry.dispose();
    }
    if (obj.material) {
        // Handle single material or array of materials
        if (Array.isArray(obj.material)) {
            obj.material.forEach(material => material.dispose());
        } else {
            obj.material.dispose();
        }
    }
  });
  group.clear();
  scene.remove(group);
  scene.remove( grid_helper );

  // Model cleanup (?)
  for(let i=0; i<model.length; i++) {
    if (typeof model[i]) {
      scene.remove( model[i] );
      model[i].geometry.dispose();
      model[i].material.dispose();
    }
  }
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
  
  bb.setFromArray([0,0,0,0,0,0]);
  let vcount = 0, fcount = 0;
  for (let i = 0; i < meshes.length; i++) {
    meshes[i].geometry.deleteAttribute( 'normal' );
    try {
      meshes[i].geometry = BufferGeometryUtils.mergeVertices(meshes[i].geometry);
    } catch(err) {
      console.error("BufferGeometryUtils.mergeVertices: " +  err);
    }
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
    // Fill group by meshes
    if(!gltf) {
      group.add(meshes[i]);
    }

    bb.expandByObject(meshes[i]);

    vcount += model[i].geometry.index.count;
    fcount += model[i].geometry.index.count / 3;
  }

  if(gltf)
    group = sceneGLTF;
  
  group.name = "model";
  scene.add(group);

  // console.log(scene); // DEBUG
  //console.log(model.geometry.attributes);
  //console.log(model.geometry);
  //console.log(model.geometry.getAttribute( 'position' ));

  // Display stat
  document.getElementById("stat").innerHTML = meshes.length + " meshes / " + vcount + " points / " + fcount + " faces";

  // Set view
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
// Fill model with matcap
//
async function setFill(checked) {
  fill = checked;
}
window.setFill = setFill;

// Resize
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize( window.innerWidth, window.innerHeight );
}
window.onWindowResize = onWindowResize;

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

    //const reverseVertices = document.getElementById("reverse_vertices").checked;
    const reverseVertices = true;
    const result = exporter.parse( scene, material.flatShading, material.vertexColors, reverseVertices, sourceFile );
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

  if(rotate) {
    let dX = (rotX - controller.rotation.x) * rotK;
    let dY = (rotY - controller.rotation.y) * rotK;

    if(Math.abs(dX) > rotTH) {
      group.rotation.x += dX;
      rotX = controller.rotation.x;
    }

    if(Math.abs(dY) > rotTH) {
      group.rotation.y += dY;
      rotY = controller.rotation.y;
    }
  }

  ocontrols.update();
  renderer.render(scene, camera);
}

//
// Run
//
await init();
animate();
