//
// POV-Ray studio
// https://povlab.yesbird.online/studio/
//
//
// Author: Yesbird (https://yesbird.online)
// Date: 15.10.25 
//
#version 3.8;
global_settings{ assumed_gamma 1 }

//
// Mike Miller's materials collection
//
#include "materials/default_materials.inc" 
#include "materials/materials_wood.inc"


// -----------------------------------------------------------------------------------------
//                      M O D E L
//------------------------------------------------------------------------------------------ 
#include "model.inc"

//
// Experiments with vertex array (select checkbox 'Export arrays' in studio GUI to get them) 
//
/*
#declare Index = 0;
#while (Index < dimension_size(v1, 1))
    #declare cv = v1[Index];
    sphere { cv,  pow((cv.y / 20), 3) pigment { rgb cv / 40 - 0.1} }

    #declare Index = Index + 1;
#end

#declare Index = 0;
#while (Index < dimension_size(v2, 1))
    #declare cv = v2[Index];
    sphere { cv,  5.0 - cv.y / 10  pigment { rgb cv / 50 } }

    #declare Index = Index + 1;
#end
*/

// -----------------------------------------------------------------------------------------
//                      C A M E R A 
//------------------------------------------------------------------------------------------ 
camera { perspective angle 50
         location  <RADIUS, RADIUS, RADIUS> * 1.5
         look_at   CENTER
         right     x * image_width / image_height }

// -----------------------------------------------------------------------------------------
//                      L I G H T S
//------------------------------------------------------------------------------------------ 
#declare power = 0.6;

#declare light_camera =
light_source {
    <RADIUS, RADIUS, RADIUS> * 5
    #declare light_color = color red 1 green 1 blue 1 ;                      
    light_color * power * 0.1
    area_light
    <50, 0, 0> <0, 0, 50>         
    4, 4                          
    adaptive 0                    
    jitter                        
    circular                      
    orient                     
    fade_distance 600
    fade_power 2     
    photons {reflection on refraction on }
}   
light_camera


#declare light_right =
light_source {
    <0,0,RADIUS> * 3
    #declare light_color = color red 1 green 1 blue 1 ;                      
    light_color * power * 0.5
    area_light
    <50, 0, 0> <0, 0, 50>         
    4, 4                          
    adaptive 0                    
    jitter                        
    circular                      
    orient                     
    fade_distance 400
    fade_power 2     
    photons {reflection on refraction on }
}   
light_right

#declare light_left =
light_source {
    <0,0,-RADIUS> * 7
    #declare light_color = color red 1 green 1 blue 1 ;                      
    light_color * power * 0.8
    area_light
    <50, 0, 0> <0, 0, 50>         
    4, 4                          
    adaptive 0                    
    jitter                        
    circular                      
    orient                     
    fade_distance 400
    fade_power 2     
    photons {reflection on refraction on }
}   
light_left

#declare light_top =
light_source {
     <0,RADIUS,0> * 4
    #declare light_color = color red 1 green 1 blue 1 ;                      
    light_color * power / 8
    area_light
    <50, 0, 0> <0, 0, 50>         
    4, 4                          
    adaptive 0                    
    jitter                        
    circular                      
    orient                     
    fade_distance 400
    fade_power 2     
    shadowless 
    photons {reflection on refraction on }
}   
light_top

#declare light_bottom =
light_source {
     <0,-RADIUS,0> * 4
    #declare light_color = color red 1 green 1 blue 1 ;                      
    light_color * power * 0.3
    area_light
    <50, 0, 0> <0, 0, 50>         
    4, 4                          
    adaptive 0                    
    jitter                        
    circular                      
    orient                     
    fade_distance 400
    fade_power 2     
    shadowless 
    photons {reflection on refraction on }
}   
light_bottom

// -----------------------------------------------------------------------------------------
//                      S K Y
//------------------------------------------------------------------------------------------ 
background { rgb <0.12, 0.11, 0.1> * .1 }
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

object { bg_sphere (<4000,4000,4000>, <30,30,30>, 275)
  no_image 
  scale <1,1,1>}

//------------------------------------------------------------------------------------------
