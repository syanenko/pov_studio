// TODO:
//
// - Fix small scale on load model after return from XR
// - Reset: Double click
// - Start/Stop rotation: single click
// - Use camera (?)
// - Take a link (?)
//
import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { AsyncLoader } from './modules/AsyncLoader.js';
import { VertexNormalsHelper } from 'three/addons/helpers/VertexNormalsHelper.js';

const DEFAULT_MODEL = '/data/models/teapot.glb';
const PATH_GLAZES   = '/data/mat/';
let DEFAULT_GLAZE   = "sculpty";

// Helpers
let help = false;

// Common
let container;
let camera, scene, renderer;
const FOV = 50;
let ocontrols;
let controller, rotX, rotY;
const rotTH = 0.005;
const rotK = 3;

// XR
let beam;
const beam_color = 0xffffff;
const beam_hilight_color = 0x222222;
let pmatrix;
let rotate = false;

let material, model;

//
// Init
//
async function init() {

  camera = new THREE.PerspectiveCamera( FOV, window.innerWidth / window.innerHeight, 0.1, 1000 );
  camera.position.set( 0, 2, 3 );
  pmatrix = camera.projectionMatrix.clone();

  scene = new THREE.Scene();
  scene.add( camera );

  // Helpers
  if(help) {
    let o = new THREE.Vector3(0,0,0);
    let x = new THREE.Vector3(1,0,0);
    let y = new THREE.Vector3(0,1,0);
    let z = new THREE.Vector3(0,0,1);
    scene.add( new THREE.GridHelper( 2, 20 ) );
    scene.add( new THREE.ArrowHelper(x,o,2,'crimson') );
    scene.add( new THREE.ArrowHelper(y,o,2,'green') );
    scene.add( new THREE.ArrowHelper(z,o,2,'royalblue') );
  }

  window.addEventListener( 'resize', onWindowResize );

  renderer = new THREE.WebGLRenderer({alpha: true, antialias: true});
  renderer.setSize( window.innerWidth, window.innerHeight);
  renderer.setPixelRatio( window.devicePixelRatio );
  container = document.getElementById("container");
  container.appendChild( renderer.domElement );

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;

  // XR
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

    cpos.copy(camera.position);
    crot.copy(camera.quaternion);

    mpos.copy(model.position);
    mrot.copy(model.quaternion);

    model.position.z = -3;
    model.position.y = -1;
    model.rotation.x = 0.3;

    //gui_mesh.visible = true;
  });

  // XR end
  renderer.xr.addEventListener( 'sessionend', function ( event ) {
    renderer.setClearColor(new THREE.Color(0x000), 0);

    rotate = false;
    model.position.copy(mpos);
    model.quaternion.copy(mrot);

    camera.position.copy(cpos);
    camera.quaternion.copy(crot);
    camera.projectionMatrix.copy(pmatrix);
    camera.fov = FOV;

    onWindowResize();
    //gui_mesh.visible = false;
  });

  // Init orbit controlls
  ocontrols = new OrbitControls( camera, renderer.domElement );
  ocontrols.enablePan = true;

  // Load default model
  const queryString = window.location.search;
  const urlParams = new URLSearchParams(queryString);
  let design = urlParams.get('d');
  if(design == undefined) {
     design = "pc01006"; // On page: pc01006, pc01024, pc01028c, pc01062, pc01082 
                         // Reserved: pc01065, pc01076, pc01084, pc01086, pc01101, pc01102, pc01103, pc01105, pc01106, pc01006a, pc01006b, pc01105, pc01035, pc01042, pc01043, pc01061
  }

  await loadModel({model: DEFAULT_MODEL});
  await applyGlaze(DEFAULT_GLAZE);
}

//
// Get geometry
// 
function getGeo(obj) {
  let geo;
  if(obj.scene)
    obj = obj.scene

  obj.traverse(e =>{
    if(e.isMesh) {
      geo = e.geometry;
  }})

  return geo;
}

//
// Load model
//
async function loadModel(args)
{
  // Cleanup
  if (typeof model !== "undefined") {
    scene.remove( model );
    model.geometry.dispose();
    model.material.dispose();
    renderer.renderLists.dispose();
  }

  // Load geometry
  if(args.model) {
    var path = args['model'];
  } else {
    console.error('No model in function argumets');
    return;
  }

  let geo;
  const ext = path.slice(-4);
  switch(ext)
  {
    case '.obj': geo = getGeo((await AsyncLoader.loadOBJAsync(path)));  break;
    case '.fbx': geo = getGeo((await AsyncLoader.loadFBXAsync(path)));  break;
    case '.glb': geo = getGeo((await AsyncLoader.loadGLTFAsync(path))); break;
    case 'gltf': geo = getGeo((await AsyncLoader.loadGLTFAsync(path))); break;
    case '.stl': geo = (await AsyncLoader.loadSTLAsync(path));          break;
    default: console.error("Unknown file extention: '" + ext + "'");
  }

  // DEBUG
  geo.deleteAttribute( 'uv' ); // Smooth
  geo.deleteAttribute( 'normal' );
  geo.deleteAttribute( 'color' );
  geo = BufferGeometryUtils.mergeVertices(geo);
  geo.computeVertexNormals();

  // Scale
  geo.computeBoundingSphere();
  let scale = 1 / geo.boundingSphere.radius;
  let lookAt = geo.boundingSphere.radius / 2;
  if(path.includes("teapot")) {
    scale *= 1.5; 
    lookAt = 0.3;
  } else if(path.includes("cup")) {
    scale *= 1.1; 
    lookAt = 0.6;
  } else if(path.includes("ewer")) {
    scale *= 1.25; 
    lookAt = 0.6;
  } else if(path.includes("plate")) {
    scale *= 1.3; 
    lookAt = 0;
  }

  geo.scale(scale, scale, scale);

  // Reset view
  ocontrols.reset();
  ocontrols.target.set( 0, lookAt, 0 );

  // Apply material
  if( material == undefined) {
    let matcap = await AsyncLoader.loadTextureAsync(PATH_GLAZES + DEFAULT_GLAZE + "_mcap.png");
    matcap.colorSpace = THREE.SRGBColorSpace;
    material = new THREE.MeshMatcapMaterial( {matcap: matcap, side: THREE.DoubleSide} );
    material.flatShading = false;
  }

  model = new THREE.Mesh( geo, material );
  scene.add(model);

  if(help) {
    scene.add( new VertexNormalsHelper( model, 0.2 ) );
  }
}
window.loadModel = loadModel;

//
// Apply glaze
//
async function applyGlaze(glaze) {
  // Material
  const matcap = glaze + "_mcap.png";
  model.material.matcap.dispose();
  model.material.matcap = await AsyncLoader.loadTextureAsync(PATH_GLAZES + matcap);
  model.material.matcap.colorSpace = THREE.SRGBColorSpace;
  // Image
  const gi = document.getElementById("glaze_image");
  if(gi != null) {
    document.getElementById("glaze_image").src = PATH_GLAZES + glaze + ".png";
  }

  // Info
  /*
  var txtFile = new XMLHttpRequest();
  const text = PATH_GLAZES + glaze + ".html";
  txtFile.open("GET", text, true);
  txtFile.onreadystatechange = function() {
    if (txtFile.readyState === 4) {  // Makes sure the document is ready to parse.
      if (txtFile.status === 200) {  // Makes sure it's found the file.
        document.getElementById('glaze_info').innerHTML = txtFile.responseText;
      }
    }
  }
  txtFile.send(null);
  */
}
window.applyGlaze = applyGlaze;


// Resize
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize( window.innerWidth, window.innerHeight );
}

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
      model.rotation.x += dX;
      rotX = controller.rotation.x;
    }

    if(Math.abs(dY) > rotTH) {
      model.rotation.y += dY;
      rotY = controller.rotation.y;
    }
  }

  renderer.render(scene, camera);
  ocontrols.update();
}

//
// Run
//
await init();
animate();
