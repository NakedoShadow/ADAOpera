// ADA Opera — La Voix de la Reine | Tauri v2 Entry Point
// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    ada_opera_lib::run()
}
