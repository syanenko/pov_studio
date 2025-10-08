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
         location  <RADIUS, RADIUS, RADIUS> * 1.1
         look_at   CENTER
         right     x * image_width / image_height }

// Lights
//light_source{<-RADIUS, RADIUS, RADIUS> * 6 color rgb 0.}
//light_source{<RADIUS, RADIUS, RADIUS>  * 6 color rgb 1}
// -----------------------------------------------------------------------------------------
//                      L I G H T S
//------------------------------------------------------------------------------------------ 

#declare light_left =
light_source {
    <0,0,0> 
    #declare light_color = color red 1 green 1 blue 1 ;                      
    light_color * 1                  
    area_light
    <50, 0, 0> <0, 0, 50>         
    4, 4                          
    adaptive 0                    
    jitter                        
    circular                      
    orient                     
    fade_distance 600
    fade_power 2     
    translate <-200,100,150>
}   
light_left


#declare light_right =
light_source {
    <0,0,0> 
    #declare light_color = color red 1 green 1 blue 1 ;                      
    light_color * 1                  
    area_light
    <50, 0, 0> <0, 0, 50>         
    4, 4                          
    adaptive 0                    
    jitter                        
    circular                      
    orient                     
    fade_distance 400
    fade_power 2     
    translate <200,200,-150>
}   
light_right 


#declare light_under =
light_source {
    <0,0,0> 
    #declare light_color = color red 1 green 1 blue 1 ;                      
    light_color * .2                  
    area_light
    <50, 0, 0> <0, 0, 50>         
    4, 4                          
    adaptive 0                    
    jitter                        
    circular                      
    orient                     
    fade_distance 400
    fade_power 2     
    translate <-100,100,0> 
    shadowless 
}   
//light_under 


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
object { bg_sphere (<4000,4000,4000>, <0,100,0>, 275)
  no_image 
  scale <-1,1,1> }
// rotate y * 180