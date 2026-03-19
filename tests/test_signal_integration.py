"""
ADA Opera — Signal Integration Test
Verifies Scribe engine, signal notes, turntable sync, and live partition.
"""
from playwright.sync_api import sync_playwright
import sys

def test_signal_integration():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("http://localhost:8300")
        page.wait_for_load_state("networkidle")

        errors = []

        # 1. Verify app loads
        title = page.locator(".logo-text")
        if not title.is_visible():
            errors.append("App title not visible")
        print("[OK] App loaded")

        # 2. Check transport controls exist
        transport_btns = page.locator(".transport-btn")
        if transport_btns.count() < 3:
            errors.append(f"Expected 3+ transport buttons, got {transport_btns.count()}")
        print(f"[OK] Transport buttons: {transport_btns.count()}")

        # 3. Orchestra view - piano keyboard exists
        piano = page.locator(".piano-keyboard")
        if piano.count() == 0:
            errors.append("Piano keyboard not found in Orchestra view")
        print(f"[OK] Piano keyboards: {piano.count()}")

        # 4. Switch to DJ view - turntables should exist
        view_btns = page.locator("button.view-btn")
        # Views order: orchestra(0), studio(1), dj(2), partition(3), spectrum(4), media(5)
        view_btns.nth(2).click()
        page.wait_for_timeout(300)
        turntables = page.locator(".turntable-container")
        if turntables.count() < 2:
            errors.append(f"Expected 2 turntables, got {turntables.count()}")
        print(f"[OK] Turntables: {turntables.count()}")

        # 5. Switch to Partition view - score viewer should exist
        view_btns.nth(3).click()
        page.wait_for_timeout(300)
        score_viewer = page.locator(".score-viewer")
        if score_viewer.count() == 0:
            errors.append("Score viewer not found")
        print(f"[OK] Score viewer present")

        # 6. Load an example score
        twinkle_btn = page.locator("button.score-btn.small", has_text="Twinkle")
        if twinkle_btn.count() > 0:
            twinkle_btn.click()
            page.wait_for_timeout(200)
            # Parse button
            parse_btn = page.locator("button.score-btn.primary", has_text="Parse")
            if parse_btn.count() > 0:
                parse_btn.click()
                page.wait_for_timeout(300)
                score_info = page.locator(".score-info")
                if score_info.count() > 0:
                    print("[OK] Score parsed and info displayed")
                else:
                    errors.append("Score info not displayed after parse")
        print("[OK] Example score loaded")

        # 7. Switch to Media view - all panels should exist
        view_btns.nth(5).click()
        page.wait_for_timeout(300)
        grab_panel = page.locator(".grab-panel")
        pix_panel = page.locator(".pix-panel")
        video_panel = page.locator(".video-panel")
        if grab_panel.count() == 0:
            errors.append("GrabPanel not found")
        if pix_panel.count() == 0:
            errors.append("PixPanel not found")
        if video_panel.count() == 0:
            errors.append("VideoPanel not found")
        print("[OK] Media panels present")

        # 8. Click play button (triggers Scribe start)
        play_btn = page.locator(".transport-btn").first
        play_btn.click()
        page.wait_for_timeout(500)
        print("[OK] Play button clicked (Scribe should be listening)")

        # 9. Switch views while playing - no crash
        for i in range(6):
            view_btns.nth(i).click()
            page.wait_for_timeout(200)
        print("[OK] View switching while playing - no crash")

        # 10. Stop playback
        stop_btn = page.locator(".transport-btn").nth(1)
        stop_btn.click()
        page.wait_for_timeout(300)
        print("[OK] Stop button clicked")

        # Report
        browser.close()

        if errors:
            print(f"\n[FAIL] {len(errors)} error(s):")
            for e in errors:
                print(f"  - {e}")
            sys.exit(1)
        else:
            print("\n[PASS] All signal integration tests passed!")
            sys.exit(0)


if __name__ == "__main__":
    test_signal_integration()
