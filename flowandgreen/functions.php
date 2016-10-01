<?php
add_action( 'wp_enqueue_scripts', 'theme_enqueue_styles' );
function theme_enqueue_styles() {
    wp_enqueue_style( 'parent-style', get_template_directory_uri() . '/style.css' );
    wp_enqueue_style( 'child-style',
        get_stylesheet_directory_uri() . '/style.css',
        array('parent-style')
    );
}
function enqueue_my_scripts() {
wp_enqueue_script( 'jquery', '//ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js', array('jquery'), '1.9.1', true); // we need the jquery library for Bootstrap js to function
wp_enqueue_script( 'bootstrap-js', '//netdna.bootstrapcdn.com/bootstrap/3.0.0/js/bootstrap.min.js', array('jquery'), true); // all the bootstrap JavaScript goodness
}
add_action('wp_enqueue_scripts', 'enqueue_my_scripts');
function enqueue_my_styles() {
wp_enqueue_style( 'bootstrap', '//netdna.bootstrapcdn.com/bootstrap/3.0.0/css/bootstrap.min.css' );
wp_enqueue_style( 'my-style', get_template_directory_uri() . '/style.css');
}
add_action('wp_enqueue_scripts', 'enqueue_my_styles');
