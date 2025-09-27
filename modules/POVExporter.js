import {
  Color,
  ColorManagement,
  Matrix3,
  SRGBColorSpace,
  Vector2,
  Vector3
} from 'three';

class POVExporter {

  parse( object, flat_shading ) {

    let output = '';

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
      const indices = geometry.getIndex();

      // Name of the mesh object
      output += 'mesh2 { ' + mesh.name + '\n';

      // Vertices
      if ( vertices !== undefined ) {
        output += '  vertex_vectors {\n';
        output += '    ' + vertices.count + ',\n';
        for ( let i = 0, l = vertices.count; i < l; i ++, nbVertex ++ ) {

          vertex.fromBufferAttribute( vertices, i );

          // transform the vertex to world space
          vertex.applyMatrix4( mesh.matrixWorld );

          // transform the vertex to export format
          output += '    <' + vertex.x + ', ' + vertex.y + ', ' + vertex.z + '>,\n';
        }
        output += '  }\n';
      }

      // uvs
      /*
      if ( uvs !== undefined ) {

        for ( let i = 0, l = uvs.count; i < l; i ++, nbVertexUvs ++ ) {

          uv.fromBufferAttribute( uvs, i );

          // transform the uv to export format
          output += 'vt ' + uv.x + ' ' + uv.y + '\n';

        }
      }*/

      // Normals
      if ( (normals !== undefined) && (!flat_shading) ) {
        output += '  normal_vectors {\n';
        output += '    ' + vertices.count + ',\n';
        normalMatrixWorld.getNormalMatrix( mesh.matrixWorld );
        for ( let i = 0, l = normals.count; i < l; i ++, nbNormals ++ ) {
          normal.fromBufferAttribute( normals, i );
          // transform the normal to world space
          normal.applyMatrix3( normalMatrixWorld ).normalize();
          // transform the normal to export format
          output += '    <' + normal.x + ', ' + normal.y + ', ' + normal.z + '>,\n';
        }
        output += '  }\n';
      }

      // Faces
      if ( indices !== null ) {
        output += '  face_indices  {\n';
        output += '    ' + indices.count / 3+ ',\n';
        for ( let i = 0, l = indices.count; i < l; i += 3 ) {
          for ( let m = 0; m < 3; m ++ ) {
            const j = indices.getX( i + m );
            face[ m ] = ( indexVertex + j );
          }
          output += '    <' + face.join( ',' ) + '>,\n';
        }
        output += '  }\n';
      }

      // update index
      indexVertex += nbVertex;
      indexVertexUvs += nbVertexUvs;
      indexNormals += nbNormals;
    }
/*
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
*/
    object.traverse( function ( child ) {
      if ( child.isMesh === true ) {
        parseMesh( child );
      }
/*
      if ( child.isLine === true ) {
        parseLine( child );
      }

      if ( child.isPoints === true ) {
        parsePoints( child );
      }
*/
    } );

    output += '  pigment {rgb 1}\n';
    output += '}\n';
    return output;
  }
}

export { POVExporter };
