//
// POV-Ray studio
//
// URL: https://povlab.yesbird.online/studio/
//
//
#version 3.7;
global_settings{
  assumed_gamma 1.0
/*
  radiosity {
    pretrace_start 0.08           // start pretrace at this size
    pretrace_end   0.04           // end pretrace at this size
    count 1                      // higher -> higher quality (1..1600) [35]

    nearest_count 5               // higher -> higher quality (1..10) [5]
    error_bound 1.8               // higher -> smoother, less accurate [1.8]
    recursion_limit 3             // how much interreflections are calculated (1..5+) [3]

    low_error_factor .5           // reduce error_bound during last pretrace step
    gray_threshold 0.0            // increase for weakening colors (0..1) [0]
    minimum_reuse 0.015           // reuse of old radiosity samples [0.015]
    brightness 1                  // brightness of radiosity effects (0..1) [1]

    adc_bailout 0.01/2
    normal on                   // take surface normals into account [off]
    //media on                    // take media into account [off]
    //save_file "file_name"       // save radiosity data
    //load_file "file_name"       // load saved radiosity data
    //always_sample off           // turn sampling in final trace off [on]
    //max_sample 1.0              // maximum brightness of samples
  }
*/
  photons {
    count 50000000
    autostop 0
    jitter 0.5
  }
}
#default{ finish{ ambient 0.1 diffuse 0.9 }}

#include "materials/default_materials.inc" 
#include "materials/materials_wood.inc"


// -----------------------------------------------------------------------------------------
//                      M O D E L
//------------------------------------------------------------------------------------------ 
object {
  #include "model.inc"
  // rotate <200, -100, 200>
  rotate <230, -90, 200>
  photons {target refraction on reflection on}
}

// -----------------------------------------------------------------------------------------
//                      C A M E R A 
//------------------------------------------------------------------------------------------ 
camera { perspective angle 55
         location  <RADIUS, RADIUS, RADIUS> * 1.1
         look_at   CENTER
         right     x * image_width / image_height }

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
    photons {reflection on refraction on }
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
    translate <200,-200,150>
    photons {reflection on refraction on }
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
    translate <0,100,0> 
    shadowless 
    photons {reflection on refraction on }
}   
light_under

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

object { bg_sphere (<4000,4000,4000>, <0,100,0>, 275)
  no_image 
  scale <-1,1,1> }
//------------------------------------------------------------------------------------------