// TODO
//
// - vertexColors Threejs vs ZBrush
// - vertexColors + flatShading ?
// - inc: header
// - Help in about
//
import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { VertexNormalsHelper } from 'three/addons/helpers/VertexNormalsHelper.js';

import { AsyncLoader } from './modules/AsyncLoader.js';
import { POVExporter } from './modules/POVExporter.js';

const DEFAULT_MODEL = 'data/models/teapot.glb';
// const DEFAULT_MODEL = 'data/models/skull.obj';
// const DEFAULT_MODEL = 'data/models/hubble.glb';
// const DEFAULT_MODEL = 'data/models/two_cubes_test.obj';
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

let bb;
let bs;

let material, model = [];
let glaze = DEFAULT_GLAZE;

let cb_VertexColors;
let cb_DisplayAxis;
let cb_DisplayFloor;
let cb_DisplayNormals;

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
  await loadModel({model: DEFAULT_MODEL});
  await applyGlaze(DEFAULT_GLAZE);

  // Display on startup
  cb_DisplayAxis.click();
  cb_DisplayFloor.click();
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

  await makeMaterial();

  // Load geometry
  if(args.model) {
    var path = args['model'];
  } else {
    console.error('No model in function argumets');
    return;
  }

  let meshes = [];
  const ext = path.slice(-4);
  switch(ext)
  {
    case '.obj':
    case '.OBJ': meshes = getMeshes((await AsyncLoader.loadOBJAsync(path)));
                 break;
    case '.stl':
    case '.STL': meshes.push(await AsyncLoader.loadSTLAsync(path)); // Single geometry
                 break;
    case '.fbx':
    case '.FBX': meshes = getMeshes((await AsyncLoader.loadFBXAsync(path)));
                 break;
    case '.glb':
    case '.GLB': meshes = getMeshes((await AsyncLoader.loadGLTFAsync(path)).scene);
                 break;
    case 'gltf':
    case 'GLTF': meshes = getMeshes((await AsyncLoader.loadGLTFAsync(path)));
                 break;

    default: console.error("Unknown file extention: '" + ext + "'");
  }

  bb = new THREE.Box3();
  for (let i = 0; i < meshes.length; i++) {
    meshes[i].geometry.deleteAttribute( 'normal' );
    meshes[i].geometry = BufferGeometryUtils.mergeVertices(meshes[i].geometry);
    meshes[i].geometry.computeVertexNormals();

    meshes[i].material.dispose();
    meshes[i].material = material;
    meshes[i].name = "part";
    model.push(meshes[i]);
    scene.add(meshes[i]);
    bb.expandByObject(meshes[i]);
  }
  //console.log(model); // DEBUG
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
// Make material
//
async function makeMaterial() {
  if( material != undefined) {
    if(material.matcap)
      material.matcap.dispose();
    material.dispose();
  }
  // DEBUG Vertez colors
  //const pointLight = new THREE.PointLight(0xffffff, 300, 1000); // Color, Intensity, Distance
  //pointLight.position.set(3, 3, 3);
  //scene.add(pointLight);
  let shading = document.getElementById("shading").value;

  if(cb_VertexColors.checked) {
    material = new THREE.MeshStandardMaterial( {side: THREE.DoubleSide, vertexColors: true} ); }
  else if(shading == "wireframe") {
    material = new THREE.MeshStandardMaterial( {side: THREE.DoubleSide, wireframe: true} ); }
  else {
    let matcap = await AsyncLoader.loadTextureAsync(PATH_GLAZES + glaze + "_mcap.png");
    matcap.colorSpace = THREE.SRGBColorSpace;
    material = new THREE.MeshMatcapMaterial( {matcap: matcap, side: THREE.DoubleSide} );
  }

  if(shading == "flat")
    material.flatShading = true;
  else if(shading == "normal")
    material.flatShading = false;

  return material;
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
async function updateMaterial() {
  await makeMaterial();
  for(let i=0; i<model.length; i++) {
    model[i].material.dispose();
    model[i].material = material;
    model[i].material.needsUpdate;
  }
}
window.updateMaterial = updateMaterial;

//
// Switch normals
//
/*
async function displayNormals(checked) {
  normals = checked;
  displayNormals(normals);
}
window.displayNormals = displayNormals;
*/

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
  const result = exporter.parse( scene, material.flatShading, material.vertexColors, bb, bs );
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
