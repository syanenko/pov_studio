// TODO:
//
// - Help in about
// - inc: header
// - vertexColors Threejs vs ZBrush
// - vertexColors + flatShading ?
//
import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { VertexNormalsHelper } from 'three/addons/helpers/VertexNormalsHelper.js';

import { AsyncLoader } from './modules/AsyncLoader.js';
import { POVExporter } from './modules/POVExporter.js';

const DEFAULT_MODEL = 'data/models/teapot.glb';
// const DEFAULT_MODEL = 'data/models/hubble.glb';
// const DEFAULT_MODEL = 'data/models/test_spiral.stl';
// const DEFAULT_MODEL = 'data/models/skull.obj';
// const DEFAULT_MODEL = 'data/models/hand.obj';
// const DEFAULT_MODEL = 'data/models/cube.fbx';

const PATH_GLAZES   = 'data/mat/';
const DEFAULT_GLAZE = "skeleton";

let container;
let camera, scene, renderer;
const FOV = 50;
let ocontrols;

let normals = false;

let material, model = [];
let glaze = DEFAULT_GLAZE;

//
// Init
//
async function init() {
  camera = new THREE.PerspectiveCamera( FOV, window.innerWidth / window.innerHeight, 0.1, 5000 );
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

  // Display on startup
  document.getElementById("display_axis").click();
  document.getElementById("display_floor").click();
}

//
// Get geometry
// 
function getGeoms(obj) {
  let geoms = [];
  if(obj.scene)
    obj = obj.scene

  obj.traverse(e =>{
    if(e.isMesh) {
      geoms.push(e.geometry);
  }})

  return geoms;
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

  await makeMaterial();

  // Load geometry
  if(args.model) {
    var path = args['model'];
  } else {
    console.error('No model in function argumets');
    return;
  }

  let geoms = [];
  const ext = path.slice(-4);
  switch(ext)
  {
    case '.obj':
    case '.OBJ': geoms = getGeoms((await AsyncLoader.loadOBJAsync(path)));
                 break;
    case '.stl':
    case '.STL': geoms.push(await AsyncLoader.loadSTLAsync(path)); // Single geometry
                 break;
    case '.fbx':
    case '.FBX': geoms = getGeoms((await AsyncLoader.loadFBXAsync(path)));
                 break;
    case '.glb':
    case '.GLB': geoms = getGeoms((await AsyncLoader.loadGLTFAsync(path)));
                 break;
    case 'gltf':
    case 'GLTF': geoms = getGeoms((await AsyncLoader.loadGLTFAsync(path)));
                 break;

    default: console.error("Unknown file extention: '" + ext + "'");
  }

  const bb = new THREE.Box3();
  for (let i = 0; i < geoms.length; i++) {
    geoms[i].deleteAttribute( 'normal' );
    geoms[i] = BufferGeometryUtils.mergeVertices(geoms[i]);
    geoms[i].computeVertexNormals();
    // geoms[i].computeBoundingSphere();

    let surface = new THREE.Mesh( geoms[i], material );
    model.push(surface);
    scene.add(surface);
    bb.expandByObject(surface);
  }
  //console.log(model); // DEBUG
  //console.log(model.geometry.attributes);
  // console.log(model.geometry);
  //console.log(model.geometry.getAttribute( 'position' ));

  // Set view
  // TODO: calculate for all geometries max(dist from origin + radius)
  const g = 0;
  const bs = new THREE.Sphere();
  bb.getBoundingSphere(bs);

  ocontrols.reset();
  ocontrols.target.copy(bs.center);
  camera.position.set(bs.center.x,
                      bs.center.y,
                      bs.center.z + bs.radius * 3);

  axis_len = bs.radius * 2.5;
  displayAxis(false);
  displayAxis(document.getElementById("display_axis").checked);

  normals_len = bs.radius / 30;
  displayNormals(normals);

  displayFloor(false);
  displayFloor(document.getElementById("display_floor").checked);
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

  let tex = await AsyncLoader.loadTextureAsync(PATH_GLAZES + glaze + "_mcap.png");
  for(let i=0; i<model.length; i++) {
    if(model[i].material.matcap)
      model[i].material.matcap.dispose();
    model[i].material.matcap = tex;
    model[i].material.matcap.colorSpace = THREE.SRGBColorSpace;
  }
}
window.applyGlaze = applyGlaze;

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
// Flat shading
//
async function flatShading() {
  await makeMaterial();

  for(let i=0; i<model.length; i++) {
    model[i].material.dispose();
    model[i].material = material;
    model[i].material.needsUpdate;
  }
}
window.flatShading = flatShading;

//
// Vertex colors
//
async function vertexColors() {
  await makeMaterial(true);
  for(let i=0; i<model.length; i++) {
    model[i].material.dispose();
    model[i].material = material;
    model[i].material.needsUpdate;
  }
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
  const result = exporter.parse( model, material.flatShading, material.vertexColors );
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
