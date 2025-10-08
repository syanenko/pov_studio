// build a sample array of objects using materials from mat_array 
// shifts samples along the x based on 'current_sample'

#include "shapes.inc"
#include "shapes2.inc"

#declare C_gray20 =             rgb <0.2, 0.2, 0.2> ; 
#declare C_off_white =          rgb <0.99, 0.92, 0.78> ;

/*
#declare F_glow =
    finish {
    ambient 1
    diffuse 1
    emission 1.5
    phong 0
    roughness 1
    }
*/    
// gizmo 
/*
#declare gizmo = 
merge {
    difference {
        sphere { <0,0,0>, 1 }
        plane { <0,-1,0>, 0 translate <0,0,0> }
        } 
     cylinder {<0,0,0>,<0,.05,0>,.95}
     torus {.95,.05} 
     sphere {<0,0,0>,.7}  
     
    difference {
        sphere { <0,0,0>, .9 }
        plane { <0,0,1>, 0 translate <0,0,0> }
    }
    
    torus {.85,.05 rotate <90,0,0>}
    cylinder {<0,0,-.05>,<0,0,0>,.85} 
    scale <.5,.5,.5>
} 
*/
// -----------------------------------------------------------------------------------------
//                      S A M P L E    A R R A Y
//------------------------------------------------------------------------------------------  
#declare sample =       sphere {<0,0,0> .5 no_shadow} ; 
//#declare sample_cube  = object { Round_Box (<-.5,-.5,-.5>,<.5,.5,.5>,.05,1 ) no_shadow} ;
#declare sample_flat  = box { <-.5,-.5,-.5>,<.5,.5,.5> scale <1,1,1> no_shadow}


//object { gizmo material {mat_array[current_sample][1] } scale <4.1,4.1,4.1> rotate <0,-30,0> rotate <-30,0,0> translate <-4.75,-4.0,0> }
//object { sample_cube  material {mat_array[current_sample][1]} scale <2.7,2.7,2.7> rotate <0,45,0> rotate <-30,0,0>  translate <0,-4.2,0>  }
object { sample_flat  material {mat_array[current_sample][1]} scale <20,20,1> rotate < 20,0,0> translate <0,0,0>}
object { sample       material {mat_array[current_sample][1]} scale 15.01 translate <0,0,0>}   

// -----------------------------------------------------------------------------------------
//                      C A M E R A 
//------------------------------------------------------------------------------------------ 
#declare cam_front =
    camera {
        up <0, 1, 0>  
        angle 8.25    
        location <0,-2.75,-105> 
        look_at  <0,0,0>
    } 
camera {cam_front}   

 
// -----------------------------------------------------------------------------------------
//                      L I G H T S
//------------------------------------------------------------------------------------------ 

#declare light_left =
light_source {
    <0,0,0> 
    #declare light_color = color red 1 green 1 blue 1 ;                      
    light_color * .5                  
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
//light_left


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
//light_right 


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
    translate <-100,-100,0> 
    shadowless 
}   
//light_under 
    
// -----------------------------------------------------------------------------------------
//                      S K Y
//------------------------------------------------------------------------------------------ 
background { rgb <0.12, 0.11, 0.1> * .2 }
#declare img = "studio_2k.jpg" 
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
  scale <-1,1,1>
}

