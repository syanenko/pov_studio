//
// POV-Ray studio
//
// URL: https://povlab.yesbird.online/studio/
//
//
#version 3.8;
global_settings{
  assumed_gamma 1.8
/*
  radiosity {
    pretrace_start 0.08           // start pretrace at this size
    pretrace_end   0.04           // end pretrace at this size
    count 600                    // higher -> higher quality (1..1600) [35]

    nearest_count 10               // higher -> higher quality (1..10) [5]
    error_bound 1.8               // higher -> smoother,   less accurate [1.8]
    recursion_limit 3             // how much interreflections are calculated (1..5+) [3]

    low_error_factor .5           // reduce error_bound during last pretrace step
    gray_threshold 0.0            // increase for weakening colors (0..1) [0]
    minimum_reuse 0.015           // reuse of old radiosity samples [0.015]
    brightness 1                  // brightness of radiosity effects (0..1) [1]

    adc_bailout 0.01/2
    normal on                     // take surface normals into account [off]
    //media on                    // take media into account [off]
    //save_file "file_name"       // save radiosity data
    //load_file "file_name"       // load saved radiosity data
    //always_sample off           // turn sampling in final trace off [on]
    //max_sample 1.0              // maximum brightness of samples
  }
*/
/*
  photons {
    count 10000000
    autostop 0
    jitter 0.5
  }
*/
}

#default{ finish{ ambient 0.1 diffuse 0.9 }}


#include "colors.inc"
#include "stones.inc"
#include "textures.inc"
#include "glass.inc"

#include "materials/default_materials.inc" 
#include "materials/materials_wood.inc"


// -----------------------------------------------------------------------------------------
//                      M O D E L
//------------------------------------------------------------------------------------------ 
object {
  // #include "cube_vc.inc" // Not works - want to make it glassy.
  // #include "cube.inc" // Works
  #include "model.inc"
  // material { M_Dark_Green_Glass }
  // pigment {rgb 1}     
  rotate y * 90
  photons {target refraction on reflection on}
}

// -----------------------------------------------------------------------------------------
//                      C A M E R A 
//------------------------------------------------------------------------------------------ 
camera { perspective angle 50
         location  <RADIUS, RADIUS, RADIUS> * 1.4
         look_at   CENTER + x * 0.6  - y * 0.3 
         right     x * image_width / image_height }

// -----------------------------------------------------------------------------------------
//                      L I G H T S
//------------------------------------------------------------------------------------------ 
#declare power = 0.6;

#declare light_camera =
light_source {
    <RADIUS, RADIUS, RADIUS> * 5
    #declare light_color = color red 1 green 1 blue 1 ;                      
    light_color * power  / 6
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
// light_camera


#declare light_right =
light_source {
    <0,0,RADIUS> * 3
    #declare light_color = color red 1 green 1 blue 1 ;                      
    light_color * power / 5
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
    light_color * power / 4
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
    light_color * power / 1.4
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
  scale <1,1,1> / 100}
//------------------------------------------------------------------------------------------