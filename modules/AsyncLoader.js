import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OBJLoader }  from 'three/addons/loaders/OBJLoader.js';
import { FBXLoader }  from 'three/addons/loaders/FBXLoader.js';
import { STLLoader }  from 'three/addons/loaders/STLLoader.js';

const AsyncLoader = {};
AsyncLoader.gltfLoader = new GLTFLoader();
AsyncLoader.objLoader  = new OBJLoader();
AsyncLoader.fbxLoader  = new FBXLoader();
AsyncLoader.stlLoader  = new STLLoader();
AsyncLoader.textureLoader = new THREE.TextureLoader();
AsyncLoader.audioLoader   = new THREE.AudioLoader();

AsyncLoader.loadGLTFAsync = (url) => {
    return new Promise((resolve, reject) => {
        AsyncLoader.gltfLoader.load(url, obj => {
            resolve(obj);
        })
    });
}

AsyncLoader.loadOBJAsync = (url) => {
    return new Promise((resolve, reject) => {
        AsyncLoader.objLoader.load(url, obj => {
            resolve(obj);
        })
    });
}

AsyncLoader.loadFBXAsync = (url) => {
    return new Promise((resolve, reject) => {
        AsyncLoader.fbxLoader.load(url, obj => {
            resolve(obj);
        })
    });
}

AsyncLoader.loadSTLAsync = (url) => {
    return new Promise((resolve, reject) => {
        AsyncLoader.stlLoader.load(url, obj => {
            resolve(obj);
        })
    });
}

AsyncLoader.loadTextureAsync = (url) => {
    return new Promise((resolve, reject) => {
        AsyncLoader.textureLoader.load(url, (tex) => {
            resolve(tex);
        })
    });
}

AsyncLoader.loadAudioAsync = (url) => {
    return new Promise((resolve, reject) => {
        AsyncLoader.audioLoader.load(url, (buffer) => {
            resolve(buffer);
        });
    })
}

AsyncLoader.loadAll = (promiseArr, element, message) => {
    let count = promiseArr.length;
    let results = [];
    element.innerHTML = `${message}&nbsp;(${promiseArr.length - count}&nbsp;/&nbsp;${promiseArr.length})...`
    return new Promise((resolve, reject) => {
        promiseArr.forEach((promise, i) => {
            promise.then(result => {
                results[i] = result;
                count--;
                element.innerHTML = `${message}&nbsp;(${promiseArr.length - count}&nbsp;/&nbsp;${promiseArr.length})...`
                if (count === 0) {
                    resolve(results);
                }
            })
        })
    });
}
export { AsyncLoader };