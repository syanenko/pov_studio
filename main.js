// TODO:
//
// - Switch flat shading (dispose material)
// - Preserve material on upload (?)
// - Exporter
// - 
//
import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { VertexNormalsHelper } from 'three/addons/helpers/VertexNormalsHelper.js';

import { AsyncLoader } from './modules/AsyncLoader.js';
import { POVExporter } from './modules/POVExporter.js';


const DEFAULT_MODEL = '/data/models/teapot.glb';
const PATH_GLAZES   = '/data/mat/';
const DEFAULT_GLAZE = "skeleton";

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
let glaze = DEFAULT_GLAZE;

//
// Init
//
async function init() {

  camera = new THREE.PerspectiveCamera( FOV, window.innerWidth / window.innerHeight, 0.1, 1000 );
  camera.position.set( 0, 2, 3 );
  pmatrix = camera.projectionMatrix.clone();

  scene = new THREE.Scene();
  scene.add( camera );

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

  // Init orbit controlls
  ocontrols = new OrbitControls( camera, renderer.domElement );
  ocontrols.enablePan = true;

  // Load default model
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
    showNormals(false);
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
  geo.deleteAttribute( 'color' ); // TODO: Keep vertex colors (?)
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

  await makeMaterial();

  model = new THREE.Mesh( geo, material );
  scene.add(model);

  showNormals(document.getElementById("show_normals").checked);
}
window.loadModel = loadModel;

//
// Make material
//
async function makeMaterial() {
  if( material != undefined) {
    material.matcap.dispose();
    material.dispose();
  }
  let matcap = await AsyncLoader.loadTextureAsync(PATH_GLAZES + glaze + "_mcap.png");
  matcap.colorSpace = THREE.SRGBColorSpace;
  material = new THREE.MeshMatcapMaterial( {matcap: matcap, side: THREE.DoubleSide} );
  material.flatShading = document.getElementById("flat_shading").checked;
}

//
// Apply glaze
//
async function applyGlaze(_glaze) {
  if(glaze == _glaze)
    return;
  glaze = _glaze;
  model.material.matcap.dispose();
  model.material.matcap = await AsyncLoader.loadTextureAsync(PATH_GLAZES + glaze + "_mcap.png");
  model.material.matcap.colorSpace = THREE.SRGBColorSpace;
}
window.applyGlaze = applyGlaze;

//
// Show normals
//
let normals_helper;
async function showNormals(checked) {
  if(checked) {
    normals_helper = new VertexNormalsHelper( model, 0.1 )
    scene.add( normals_helper ); }
  else {
   if(normals_helper) {
    scene.remove( normals_helper );
    normals_helper.dispose();
  }}
}
window.showNormals = showNormals;

//
// Show axis
//
let arrow_helper_x;
let arrow_helper_y;
let arrow_helper_z;
async function showAxis(checked) {
  if(checked) {
    let o = new THREE.Vector3(0,0,0);
    let x = new THREE.Vector3(1,0,0);
    let y = new THREE.Vector3(0,1,0);
    let z = new THREE.Vector3(0,0,1);
    arrow_helper_x = new THREE.ArrowHelper(x,o,2,'crimson');
    arrow_helper_y = new THREE.ArrowHelper(y,o,2,'green');
    arrow_helper_z = new THREE.ArrowHelper(z,o,2,'royalblue');
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
window.showAxis = showAxis;

//
// Flat shading
//
async function flatShading() {
  await makeMaterial();
  model.material.dispose();
  model.material = material;
  model.material.needsUpdate;
}
window.flatShading = flatShading;

// Resize
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize( window.innerWidth, window.innerHeight );
}

//
// Download
//
const link = document.createElement( 'a' );
link.style.display = 'none';
document.body.appendChild( link );

function save( blob, filename ) {
  link.href = URL.createObjectURL( blob );
  link.download = filename;
  link.click();
}

function saveString( text, filename ) {
  save( new Blob( [ text ], { type: 'text/plain' } ), filename );
}

function download() {
  const exporter = new POVExporter();
  const result = exporter.parse( model );
  console.log(result);
  saveString( result, 'scene.pov' );
}
window.download = download;

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
