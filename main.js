//
// Run: sudo /opt/lampp/manager-linux-x64.run
//
//
// TODO
//
// - inc: header:
// - save the pov-lines how to use the code in a docu-block in the upper part of the file
//
// - save the name of the original file also somewhere (have now many files in my
//   download-folder like "model (4).inc" and dont know whats in it.
//
// - Help in about
// - Display model stat 
// - Save GLB/GLTF (with material tags)
// {
//  "povray": {
//    "material": "M_glass_green_water"
//  }
// }
//
// - Check GLB hierarchy (Ingenuity Mars Helicopter.glb)
// - Check selector shifting
// - Materials: add gems
// - vertexColors + flatShading (?)
//
import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { VertexNormalsHelper } from 'three/addons/helpers/VertexNormalsHelper.js';

import { AsyncLoader } from './modules/AsyncLoader.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { POVExporter } from './modules/POVExporter.js';

const DEFAULT_MODEL = 'data/models/pingouin.obj'; 
// const DEFAULT_MODEL = './data/models/test_ring.glb';
// const DEFAULT_MODEL = './data/models/test_ring.gltf';
// const DEFAULT_MODEL = 'data/models/emerald_ring.glb';
// const DEFAULT_MODEL = 'data/models/teapot.glb';
// const DEFAULT_MODEL = 'data/models/hubble.glb';
// const DEFAULT_MODEL = 'data/models/cube.fbx';
// const DEFAULT_MODEL = 'data/models/onion.fbx';
// const DEFAULT_MODEL = 'data/models/test_spiral.stl';
// const DEFAULT_MODEL = 'data/models/hand.obj';

const PATH_MATCAPS   = './data/materials/';
const DEFAULT_POVMAT = "M_light_tan_dull";
const DEFAULT_SELECTED = "M_yellow_green_gloss";

let container;
let camera, scene, renderer;
const FOV = 50;
let ocontrols;

let bb, bs;

let material, model = [];
let matcap;
let povmat = DEFAULT_POVMAT; 
let curMatcapBut;

let cb_VertexColors;
let cb_DisplayAxis;
let cb_DisplayFloor;
let cb_DisplayNormals;

let fill = false;

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

  // Load default model
  await createMaterial();
  await loadModel({model: DEFAULT_MODEL});
  curMatcapBut = document.getElementById(DEFAULT_SELECTED);
  await selectMat(curMatcapBut);

  // Defaults
  cb_DisplayAxis.click();
  cb_DisplayFloor.click();
  document.getElementById("flat").click();
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

//
// Load model
//
async function loadModel(args)
{
  // Cleanup
  displayNormals(false);
  for(let i=0; i<model.length; i++) {
    if (typeof model[i]) {
      scene.remove( model[i] );
      model[i].geometry.dispose();
      model[i].material.dispose();
    }
  }
  model.length = 0;
  renderer.renderLists.dispose();
  
  if(args.model) {
    var path = args['model'];
  } else {
    console.error('No model in function argumets');
    return;
  }

  // Load meshes
  let meshes = [];
  const ext = path.slice(-4);
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
    case '.GLB': meshes = getMeshes((await AsyncLoader.loadGLTFAsync(path)).scene);
                 break;
    case 'gltf':
    case 'GLTF': meshes = getMeshes((await AsyncLoader.loadGLTFAsync(path)).scene);
                 break;

    default: console.error("Unknown file extention: '" + ext + "'");
  }
  
  bb = new THREE.Box3();
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
    scene.add(meshes[i]);
    bb.expandByObject(meshes[i]);
  }

  //console.log(meshes[i].userData); // DEBUG
  //console.log(model.geometry.attributes);
  //console.log(model.geometry);
  //console.log(model.geometry.getAttribute( 'position' ));

  // Set view
  // TODO: calculate for all geometries max(dist from origin + radius)
  bs = new THREE.Sphere();
  bb.getBoundingSphere(bs);

  ocontrols.reset();
  ocontrols.target.copy(bs.center);
  camera.position.set(bs.center.x,
                      bs.center.y,
                      bs.center.z + bs.radius * 3);

  axis_len = bs.radius * 2.5;
  displayAxis(false);
  displayAxis(cb_DisplayAxis.checked);

  normals_len = bs.radius / 30;
  displayNormals(cb_DisplayNormals.checked);

  displayFloor(false);
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
    const exporter = new POVExporter();
    const result = exporter.parse( scene, material.flatShading, material.vertexColors, bb, bs );
    saveString( result, 'model.inc' );
  }
}
window.download = download;

//
// Selection
//
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let io = null;

function onMouseDown(event) {
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
