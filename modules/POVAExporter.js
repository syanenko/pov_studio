//
// Exports all meshes in scene to POV-Ray mesh2: https://www.povray.org/documentation/view/3.60/68/ 
// Mesh attributes: vertices, faces, normals, UVs, vertice colors
//
import {
	Color,
	ColorManagement,
	Matrix3,
	SRGBColorSpace,
	Vector2,
	Vector3
} from 'three';

class POVAExporter {
  parse( object, flat_shading, vertex_colors, bb, bs, camera, sourceFile ) {

    let output = '';
    let meshCount = 0;

    let indexVertex = 0;
    let indexVertexUvs = 0;
    let indexNormals = 0;

    const vertex = new Vector3();
    const color = new Color();
    const normal = new Vector3();
    const uv = new Vector2();

    const face = [];
    const materials = [];
    
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

      meshCount++;
      // Vertices array
      if ( vertices !== undefined ) {
        output += '#declare v' + meshCount + ' = array[' + vertices.count + '] {\n';
        for ( let i = 0, l = vertices.count; i < l; i ++, nbVertex ++ ) {
          vertex.fromBufferAttribute( vertices, i );
          // transform the vertex to world space
          vertex.applyMatrix4( mesh.matrixWorld );
          // transform the vertex to export format
          output += '  <' + vertex.x.toFixed(8) + ',' + vertex.y.toFixed(8) + ',' + vertex.z.toFixed(8) + '>,\n'
        }
        output = output.slice(0, -2) + '  \n}\n';
      }

      // Normals array
      if ((normals !== undefined) && (!flat_shading)) {
        output += '#declare n' + meshCount + ' = array[' + normals.count + '] {\n';
        normalMatrixWorld.getNormalMatrix( mesh.matrixWorld );

        for ( let i = 0, l = normals.count; i < l; i ++, nbNormals ++ ) {
          normal.fromBufferAttribute( normals, i );
          normal.applyMatrix3( normalMatrixWorld ).normalize();
          output += '  <' + normal.x.toFixed(8) + ',' + normal.y.toFixed(8) + ',' + normal.z.toFixed(8) + '>,\n'
        }
        output = output.slice(0, -2) + '  \n}\n';
      }

      // Mesh
      output += '\n#declare m' + meshCount + ' = mesh2 {\n'

      // Vertex vectors
      if ( vertices !== undefined ) {
        output += 'vertex_vectors {\n  ' + vertices.count + ',\n  ';
        for ( let i = 0, l = vertices.count; i < l; i ++) {
          output += 'v' + meshCount + '[' + i + '],';
          if(((i + 1) % 10) == 0)
            output += '\n  ';
        }
        if(output.slice(-1) == '\n')
          output = output.slice(0, -2);
        else
          output = output.slice(0, -1);
        output += '\n}\n';
      } 

      // Normal vectors
      if ((normals !== undefined) && (!flat_shading)) {
        output += 'normal_vectors {\n  ' + normals.count + ',\n  ';
        for ( let i = 0, l = normals.count; i < l; i ++) {
          output += 'n' + meshCount + '[' + i + '],';
          if(((i + 1) % 10) == 0)
            output += '\n  ';
        }

        if(output.slice(-1) == '\n')
          output = output.slice(0, -2);
        else
          output = output.slice(0, -1);
        output += '\n}\n';
      }

      // TODO: uvs - put in array (?)
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

      // TODO: texture list - put in array (?)
      if ( colors !== undefined && vertex_colors) {
        output += 'texture_list {\n  ' + (colors.count) + ',\n';
        for ( let i = 0; i<colors.count; i++ ) {
          color.fromBufferAttribute( colors, i );
          ColorManagement.fromWorkingColorSpace( color, SRGBColorSpace );
          output += 'texture{pigment{rgb <' + color.r.toFixed(8) + ',' + color.g.toFixed(8) + ',' + color.b.toFixed(8) +'>}}\n'
        }
        output += '}\n';
      }

      // Faces
      if ( indices !== null ) {
        output += 'face_indices {\n  ' + (indices.count / 3) + ',\n';
        for ( let i = 0, l = indices.count; i < l; i += 3 ) {
          for ( let m = 0; m < 3; m ++ ) {
            const j = indices.getX( i + m );
            face[ m ] = ( indexVertex + j );
          }
          output += '  <' + face[0] + ',' + face[1] + ',' + face[2] + '>,';
          if ( colors !== undefined && vertex_colors)
            output += ' ' + face[0] + ', ' + face[1] + ', ' + face[2] + ',';
          output +=  '\n';
        }
        output += '  }\n'; 
      }
      /* else { // Not implemented (Mesh1 ?)
        for ( let i = 0, l = vertices.count; i < l; i += 3 ) {
          for ( let m = 0; m < 3; m ++ ) {
            const j = i + m + 1;
            face[ m ] = ( indexVertex + j ) + ( normals || uvs ? '/' + ( uvs ? ( indexVertexUvs + j ) : '' ) + ( normals ? '/' + ( indexNormals + j ) : '' ) : '' );
          }
          output += 'f ' + face.join( ' ' ) + '\n';
        }
      }*/
      output += '}\n';

      // Save POV material name
      materials.push(mesh.userData.povray.material);
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
  /*
  //
  // POV-Ray 'mesh2' file
  //
  // Prodiced by POV-Ray studio
  //
  // URL: https://povlab.yesbird.online/studio
  // Email: yesbird65@gmail.com
  //
  // Source: teapot.glb
  // Time:   11.10.2025 1:29
  //
  // -- How to use ------------------------------------------------------------
  // 
  // 1. Install POV-Ray: https://povray.org.
  //
  // 2. Download and unzip studio template:
  //    https://povlab.yesbird.online/studio/data/download/studio.zip.
  //
  // 3. Save this file in the same directory as 'studio.pov' from 'studio.zip'.
  //
  // 4. Render 'studio.pov'.
  //
  // 5. Adjust rendering parameters in 'studio.pov' according your needs.
  //
  // --------------------------------------------------------------------------
  */
    // Header
    const now = new Date();
    output += "//\n// Prodiced by POV-Ray studio\n// https://povlab.yesbird.online/studio\n//\n";
    output += "// Source: " + sourceFile + "\n";
    output += "// Time: " + now.getDate() +  "." + (now.getMonth() + 1) + "." + now.getFullYear() + " " +
                          + now.getHours() + ":" + now.getMinutes() + "\n";
    output += "//\n"
    output += "#declare CENTER = <"+ bs.center.x.toFixed(8) + ", " + bs.center.y.toFixed(8) + ", " + bs.center.z.toFixed(8) + ">;\n";
    output += "#declare RADIUS = " + bs.radius.toFixed(8) + ";\n";
    output += "#declare XMIN = " + bb.min.x.toFixed(8) + ";\n";
    output += "#declare XMAX =" + bb.max.x.toFixed(8) + ";\n";
    output += "#declare YMIN =" + bb.min.y.toFixed(8) + ";\n";
    output += "#declare YMAX =" + bb.max.y.toFixed(8) + ";\n";
    output += "#declare ZMIN =" + bb.min.z.toFixed(8) + ";\n";
    output += "#declare ZMAX =" + bb.max.z.toFixed(8) + ";\n\n";

    object.traverse( function ( child ) {
      if ( child.isMesh === true && child.name.substring(0,4) == "part" ) {
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
    
    // Objects
    let cntGroup = 0;
    output += 'union {\n';
    let mcount = 0;
    object.traverse( function ( child ) {
      if ( child.isMesh === true && child.name.substring(0,4) == "part" ) {
        mcount++;
        output += '  object { m'+ mcount + '\n           material { ' + child.userData.povray.material + ' }\n  }\n';
      } else if (child.isGroup) {
        output += 'union {\n';
        cntGroup++;
      }

      // Check for end of group (union)
      if (child.parent && child.parent.children) {
        const parentChildren = child.parent.children;
        if (parentChildren[parentChildren.length - 1] === child && cntGroup > 0) {
          output += '}\n';
          cntGroup--;
        }
      }
    })

    output += '}\n';
    return output;
  }
}

export { POVAExporter };
