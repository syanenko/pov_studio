
// Exports mesh to POV-Ray mesh2: https://www.povray.org/documentation/view/3.60/68/ 
//
// Now export only vertices and face's indexes
//
// TODO:
// - Normals
// - UV   
// - Colors
// - Vertix faces as 'mesh1' 
//
import {
	Color,
	ColorManagement,
	Matrix3,
	SRGBColorSpace,
	Vector2,
	Vector3
} from 'three';

class POVExporter {
  parse( object, flat_shading, vertex_colors ) {

    let output = '';
    let surCount = 1;

    let indexVertex = 0;
    let indexVertexUvs = 0;
    let indexNormals = 0;

    const vertex = new Vector3();
    const color = new Color();
    const normal = new Vector3();
    const uv = new Vector2();

    const face = [];

    function parseMesh( mesh ) {

      let nbVertex = 0;
      let nbNormals = 0;
      let nbVertexUvs = 0;

      const geometry = mesh.geometry;

      const normalMatrixWorld = new Matrix3();

      // shortcuts
      const vertices = geometry.getAttribute( 'position' );
      const normals = geometry.getAttribute( 'normal' );
      const uvs = geometry.getAttribute( 'uv' );
      const colors = geometry.getAttribute( 'color' );
      const indices = geometry.getIndex();
      console.log(indices);

      // name of the mesh object
      output += '#declare surface' + surCount + ' = mesh2 {\n'
      surCount++;

      // vertices
      output += 'vertex_vectors {\n  ' + vertices.count + ',\n';
      if ( vertices !== undefined ) {
        for ( let i = 0, l = vertices.count; i < l; i ++, nbVertex ++ ) {
          vertex.fromBufferAttribute( vertices, i );
          // transform the vertex to world space
          vertex.applyMatrix4( mesh.matrixWorld );
          // transform the vertex to export format
          output += '  <' + vertex.x + ',' + vertex.y + ',' + vertex.z  + '>,\n'
        }
      }
      output += '  }\n';

      // uvs
      if ( uvs !== undefined ) {
        output += 'uv_vectors {\n  ' + uvs.count + ',\n';
        for ( let i = 0, l = uvs.count; i < l; i ++, nbVertexUvs ++ ) {
          uv.fromBufferAttribute( uvs, i );
          // transform the uv to export format
          // output += 'vt ' + uv.x + ' ' + uv.y + '\n';
          output += '  <' + uv.x + ',' + uv.y + '>,\n'
        }
        output += '  }\n';
      }

      // normals
      if ( (normals !== undefined) && (!flat_shading) ) {
        output += 'normal_vectors {\n  ' + normals.count + ',\n';
        normalMatrixWorld.getNormalMatrix( mesh.matrixWorld );
        for ( let i = 0, l = normals.count; i < l; i ++, nbNormals ++ ) {
          normal.fromBufferAttribute( normals, i );

          // transform the normal to world space
          normal.applyMatrix3( normalMatrixWorld ).normalize();

          // transform the normal to export format
          // output += 'vn ' + normal.x + ' ' + normal.y + ' ' + normal.z + '\n';
          output += '  <' + normal.x + ',' + normal.y + ',' + normal.z + '>,\n'
        }
        output += '  }\n';
      }

      // texture list
      if ( colors !== undefined && vertex_colors) {
        output += 'texture_list {\n  ' + (colors.count) + ',\n';
        for ( let i = 0; i<colors.count; i++ ) {
          color.fromBufferAttribute( colors, i );
          ColorManagement.fromWorkingColorSpace( color, SRGBColorSpace );
          output += 'texture{pigment{rgb <' + color.r + ',' + color.g + ',' + color.b +'>}}\n'
        }
        output += '}\n';
      }

      // faces
      if ( indices !== null ) {
        output += 'face_indices {\n  ' + (indices.count / 3) + ',\n';
        for ( let i = 0, l = indices.count; i < l; i += 3 ) {
          for ( let m = 0; m < 3; m ++ ) {
            const j = indices.getX( i + m );
            face[ m ] = ( indexVertex + j );
          }
          output += '  <' + face[0] + ',' + face[1] + ',' + face[2] + '>';
          if ( colors !== undefined && vertex_colors)
            output += ', ' + face[0] + ', ' + face[1] + ', ' + face[2];
          output +=  '\n';
        }
        output += '  }\n'; 
      } else { // Not implemented (Mesh1 ?)
        for ( let i = 0, l = vertices.count; i < l; i += 3 ) {
          for ( let m = 0; m < 3; m ++ ) {
            const j = i + m + 1;
            face[ m ] = ( indexVertex + j ) + ( normals || uvs ? '/' + ( uvs ? ( indexVertexUvs + j ) : '' ) + ( normals ? '/' + ( indexNormals + j ) : '' ) : '' );
          }
          output += 'f ' + face.join( ' ' ) + '\n';
        }
      }
      output += '}\n';
    }

    function parseLine( line ) {
      let nbVertex = 0;
      const geometry = line.geometry;
      const type = line.type;

      // shortcuts
      const vertices = geometry.getAttribute( 'position' );

      // name of the line object
      output += 'o ' + line.name + '\n';
      if ( vertices !== undefined ) {
        for ( let i = 0, l = vertices.count; i < l; i ++, nbVertex ++ ) {
          vertex.fromBufferAttribute( vertices, i );

          // transform the vertex to world space
          vertex.applyMatrix4( line.matrixWorld );

          // transform the vertex to export format
          output += 'v ' + vertex.x + ' ' + vertex.y + ' ' + vertex.z + '\n';
        }
      }

      if ( type === 'Line' ) {
        output += 'l ';

        for ( let j = 1, l = vertices.count; j <= l; j ++ ) {
          output += ( indexVertex + j ) + ' ';
        }

        output += '\n';
      }

      if ( type === 'LineSegments' ) {
        for ( let j = 1, k = j + 1, l = vertices.count; j < l; j += 2, k = j + 1 ) {
          output += 'l ' + ( indexVertex + j ) + ' ' + ( indexVertex + k ) + '\n';
        }
      }

      // update index
      indexVertex += nbVertex;
    }

    function parsePoints( points ) {

      let nbVertex = 0;

      const geometry = points.geometry;

      const vertices = geometry.getAttribute( 'position' );
      const colors = geometry.getAttribute( 'color' );

      output += 'o ' + points.name + '\n';

      if ( vertices !== undefined ) {
        for ( let i = 0, l = vertices.count; i < l; i ++, nbVertex ++ ) {

          vertex.fromBufferAttribute( vertices, i );
          vertex.applyMatrix4( points.matrixWorld );

          output += 'v ' + vertex.x + ' ' + vertex.y + ' ' + vertex.z;
          if ( colors !== undefined ) {
            color.fromBufferAttribute( colors, i );
            ColorManagement.fromWorkingColorSpace( color, SRGBColorSpace );
            output += ' ' + color.r + ' ' + color.g + ' ' + color.b;
          }
          output += '\n';
        }

        output += 'p ';
        for ( let j = 1, l = vertices.count; j <= l; j ++ ) {
          output += ( indexVertex + j ) + ' ';
        }
        output += '\n';
      }

      // update index
      indexVertex += nbVertex;
    }

    object.traverse( function ( child ) {
      console.log(child);
      if ( child.isMesh === true && child.name == "surface" ) {
        parseMesh( child );
      }
/* Not implement yet
      if ( child.isLine === true ) {
        parseLine( child );
      }

      if ( child.isPoints === true ) {
        parsePoints( child );
      }
*/
    });
    
    // Write union here
    // ... 
    output += 'union {\n';
    for (let i=1; i<surCount; i++) {
      output += '  object { surface'+ i +' }\n';
    }
    output += '  pigment{rgb 1}\n}\n';
    return output;
  }
}

export { POVExporter };
