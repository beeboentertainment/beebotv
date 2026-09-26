# Beebo Remote Desktop — public tester checklist

Windows test version: **0.1.61-rdtest.1**. Built and locally checked; real-device testing is pending. The 160 focused source tests and 21 simulated browser checks are not real-device passes or installer certification.

## Before testing

- Use only computers you own or have permission to control. Someone must remain at the Windows computer to approve requests and stop sharing.
- This unsigned Windows test build uses the existing Beebo installation and configuration. Back up your configuration and keep your current installer first. Do not disable security software to install it.
- Use the server’s direct HTTPS address and a trusted certificate. The normal relayed media address does not provide desktop relay. There is no STUN/TURN fallback; another-network access is not assured.
- Start with both devices on the same home network. If direct HTTPS is unavailable or the certificate is rejected, report **Blocked** and ask for help rather than bypassing the warning.
- Open `/remote-desktop` on that direct HTTPS address. If owner sign-in opens the library, open `/remote-desktop` again to reach the viewer.
- Close private content and notifications. Test input only in an empty, disposable document. Control can affect ordinary applications and files, including the application currently holding keyboard focus.
- Optional Android **1.46-tester**: check manually under **More → Help**. It is not a native Remote Desktop client; this pilot uses the phone browser.

## Report context — no personal identifiers

- Windows Beebo version:
- Windows version:
- Phone model / operating-system version:
- Browser name / version:
- Same home network or different networks:
- Display count / resolution / scaling, if relevant:

Use **Pass / Fail / Not tested / Blocked** for every result. Do not treat skipped tests as passes.

| Check | Expected result | Your result |
| --- | --- | --- |
| Setup | The test version opens; your normal library remains accessible. | |
| Default off | Remote Desktop is off initially; enabling requests does not capture the screen. | |
| Secure connection | Direct HTTPS opens without a certificate warning. | |
| Owner sign-in | Full owner sign-in and any required second factor work. Guests and ordinary household profiles cannot request desktop access. | |
| Decline | Declining the local request leaves the display unshared. | |
| View consent | Codes match; display selection is explicit; capture starts only after Start sharing. | |
| Correct display | The selected screen is shown with usable orientation and scaling. | |
| Local indicator | Sharing controls remain visible and accessible at the computer. | |
| Stop | Stop sharing ends screen updates. A new session requires fresh approval. | |
| Optional control | No input arrives until a separate local control approval. | |
| Pointer and text | A click and a short test sentence work in an empty, disposable document. | |
| View-only switch | Return to view only stops input while viewing can continue. | |
| Phone background | Switching away from the viewer releases control. | |
| Input cleanup | Ending a session leaves no key or mouse button held down. | |
| Lock or sleep | After saving your work, locking/sleeping stops sharing; it does not silently resume. | |
| Sharing-window close | Closing the local sharing window ends sharing. | |
| Connection interruption | Loss of the connection ends sharing and requires a new approval. | |
| Accessibility | Large text, keyboard focus and controls remain usable. | |
| Other network — optional | Record the actual outcome separately. This pilot does not guarantee connectivity between networks. | |

## Report a problem

- Checklist item:
- Expected result:
- Actual result:
- Short reproduction steps:
- Frequency: once / sometimes / every time:
- Observed delay, picture quality, heat, CPU load or battery impact, if relevant:

Do **not** post passwords, emails, IP addresses, server addresses, verification codes, access links, raw logs or screenshots showing personal content. Redact examples or ask for a private support route. If viewing or input continues after you stop it, stop locally, close Beebo and report privately before testing again.

[Beebo tester community](https://discord.gg/P64HjkNjB4) · [General testing guide](https://www.beeboentertainment.com/become-a-tester.html)
