// TODO:
//
// - inc: header
// - Vertex colors display
//
import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { VertexNormalsHelper } from 'three/addons/helpers/VertexNormalsHelper.js';

import { AsyncLoader } from './modules/AsyncLoader.js';
import { POVExporter } from './modules/POVExporter.js';

// const DEFAULT_MODEL = 'data/models/teapot.glb';
// const DEFAULT_MODEL = 'data/models/test_spiral.stl';
// const DEFAULT_MODEL = 'data/models/skull.obj';
// const DEFAULT_MODEL = 'data/models/hand.obj';
const DEFAULT_MODEL = 'data/models/cube.fbx';

const PATH_GLAZES   = 'data/mat/';
const DEFAULT_GLAZE = "skeleton";

let container;
let camera, scene, renderer;
const FOV = 50;
let ocontrols;

let normals = false;

let material, model;
let glaze = DEFAULT_GLAZE;

//
// Init
//
async function init() {
  camera = new THREE.PerspectiveCamera( FOV, window.innerWidth / window.innerHeight, 0.1, 1000 );
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
    displayNormals(false);
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
    case '.obj':
    case '.OBJ': geo = getGeo((await AsyncLoader.loadOBJAsync(path)));
                 geo.deleteAttribute( 'normal' );
                 geo = BufferGeometryUtils.mergeVertices(geo);
                 geo.computeVertexNormals();
                 break;

    case '.stl':
    case '.STL': geo = (await AsyncLoader.loadSTLAsync(path));
                 geo.deleteAttribute( 'normal' );
                 geo = BufferGeometryUtils.mergeVertices(geo);
                 geo.computeVertexNormals();
                 break;

    case '.fbx':
    case '.FBX': geo = getGeo((await AsyncLoader.loadFBXAsync(path)));
                 geo = BufferGeometryUtils.mergeVertices(geo);
                 break;

    case '.glb':
    case '.GLB': geo = getGeo((await AsyncLoader.loadGLTFAsync(path))); break;

    case 'gltf':
    case 'GLTF': geo = getGeo((await AsyncLoader.loadGLTFAsync(path))); break;

    default: console.error("Unknown file extention: '" + ext + "'");
  }
/*
  //geo.deleteAttribute( 'uv' );
  //geo.deleteAttribute( 'normal' );
  //geo.deleteAttribute( 'color' );
  //geo = BufferGeometryUtils.mergeVertices(geo);
  //geo.computeVertexNormals();
*/
  // Set view
  geo.computeBoundingSphere();
  ocontrols.reset();
  ocontrols.target.copy(geo.boundingSphere.center);
  camera.position.set(geo.boundingSphere.center.x,
                      geo.boundingSphere.center.y,
                      geo.boundingSphere.center.z + geo.boundingSphere.radius * 3);

  axis_len = geo.boundingSphere.radius * 2.5;
  displayAxis(false);
  displayAxis(document.getElementById("display_axis").checked);

  await makeMaterial();

  model = new THREE.Mesh( geo, material );
  scene.add(model);
  // console.log(model); // DEBUG
  console.log(model.geometry.attributes); // DEBUG
  console.log(model.geometry);

  normals_len = geo.boundingSphere.radius / 30;
  displayNormals(false);
  displayNormals(normals);
  ocontrols.update();
}
window.loadModel = loadModel;

//
// Make material
//
async function makeMaterial() {
  if( material != undefined) {
    if(material.matcap)
      material.matcap.dispose();
    material.dispose();
  }
  let matcap = await AsyncLoader.loadTextureAsync(PATH_GLAZES + glaze + "_mcap.png");
  matcap.colorSpace = THREE.SRGBColorSpace;
  // DEBUG FBX
  //const pointLight = new THREE.PointLight(0xffffff, 300, 1000); // Color, Intensity, Distance
  //pointLight.position.set(3, 3, 3);
  //scene.add(pointLight);
  if(document.getElementById("vertex_colors").checked)
    material = new THREE.MeshStandardMaterial( {side: THREE.DoubleSide, vertexColors: true} );
  else
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
  if(model.material.matcap)
    model.material.matcap.dispose();
  model.material.matcap = await AsyncLoader.loadTextureAsync(PATH_GLAZES + glaze + "_mcap.png");
  model.material.matcap.colorSpace = THREE.SRGBColorSpace;
}
window.applyGlaze = applyGlaze;

//
// Display normals
//
let normals_helper;
let normals_len = 0.1;
async function displayNormals(checked) {
  if(checked) {
    normals_helper = new VertexNormalsHelper( model, normals_len )
    scene.add( normals_helper ); }
  else {
   if(normals_helper) {
    scene.remove( normals_helper );
    normals_helper.dispose();
  }}
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
// Flat shading
//
async function flatShading() {
  await makeMaterial();
  model.material.dispose();
  model.material = material;
  model.material.needsUpdate;

  console.log(model.material.flatShading);
}
window.flatShading = flatShading;

//
// Vertex colors
//
async function vertexColors() {
  await makeMaterial(true);
  model.material.dispose();
  model.material = material;
  model.material.needsUpdate;

  console.log(model.material.vertexColors);
}
window.vertexColors = vertexColors;


//
// Switch normals
//
async function switchNormals(checked) {
  normals = checked;
  displayNormals(normals);
}
window.switchNormals = switchNormals;

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
  const result = exporter.parse( model, material.flatShading );
  saveString( result, 'model.inc' );
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
  ocontrols.update();
  renderer.render(scene, camera);
}

//
// Run
//
await init();
animate();
