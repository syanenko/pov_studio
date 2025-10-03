//
// POV-Ray studio
//
// URL: https://povlab.yesbird.online/all2pov/
//
//
#version 3.7;
global_settings{ assumed_gamma 1.0 }
#default{ finish{ ambient 0.1 diffuse 0.9 }} 

#include "materials/default_materials.inc" 
#include "materials/materials_wood.inc"

object {
  #include "model.inc"
}

camera { perspective angle 55
         location  <RADIUS, RADIUS, RADIUS>
         look_at   CENTER
         right     x * image_width / image_height }

// Lights
// light_source{<RADIUS, RADIUS, RADIUS> * 5 color rgb 2}
light_source{<-RADIUS / 4, RADIUS, RADIUS> * 1.5 color rgb 1}


// Environment
background { rgb <0.12, 0.11, 0.1> * .2 }
#declare img = "materials/studio_2k.jpg" 
#macro bg_sphere (sc, pos, rot) 
object {
    sphere  
        { 0 1 
        hollow
        pigment{
            image_map{ 
                jpeg img          
                map_type 1 
                interpolate 4 
                }
      }        
      finish { 
        ambient  1.0 
        diffuse  1 
        emission 1.5
        }
      scale sc  
      translate pos
      rotate <0, rot, 0>  
      } 
}  
#end
// object { bg_sphere (<4000,4000,4000>, <0,0,0>, 275) scale <-1,1,1> }
