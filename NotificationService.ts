import { PatientCase } from '../types';
import { playConfirmationSound } from '../utils/audio';

/**
 * BROWSER NOTIFICATION SERVICE
 * Uses the native Notification API for real-time alerts.
 * No server or FCM required.
 */
export class NotificationService {
  private static permissionGranted = false;

  /**
   * Request notification permission from the user.
   */
  static async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('⚠️ Browser notifications not supported');
      return false;
    }

    if (Notification.permission === 'granted') {
      this.permissionGranted = true;
      return true;
    }

    if (Notification.permission === 'denied') {
      return false;
    }

    const result = await Notification.requestPermission();
    this.permissionGranted = result === 'granted';
    return this.permissionGranted;
  }

  /**
   * Check if notifications are enabled.
   */
  static isEnabled(): boolean {
    return 'Notification' in window && Notification.permission === 'granted';
  }

  /**
   * Show a browser notification.
   */
  private static show(title: string, body: string, tag: string, icon?: string) {
    if (!this.isEnabled()) return;

    try {
      const notification = new Notification(title, {
        body,
        tag, // Prevents duplicate notifications with same tag
        icon: icon || '🚨',
        badge: '🚑',
        requireInteraction: true,
        silent: false,
      });

      // Auto-close after 10 seconds
      setTimeout(() => notification.close(), 10000);

      // Focus the tab when clicked
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } catch (e) {
      console.warn('Notification failed:', e);
    }
  }

  /**
   * Notify hospital/police of a new SOS case.
   */
  static notifyNewCase(c: PatientCase) {
    playConfirmationSound();
    this.show(
      '🚨 NEW SOS ALERT',
      `${c.patientName} — ${c.emergencyType}\nPhone: ${c.phoneNumber}`,
      `new-case-${c.id}`
    );
  }

  /**
   * Notify patient that ambulance has been dispatched.
   */
  static notifyDispatched(c: PatientCase) {
    playConfirmationSound();
    this.show(
      '🚑 AMBULANCE DISPATCHED',
      `${c.hospitalName || 'Hospital'} has dispatched an ambulance.\nDriver: ${c.ambulanceDriver || 'Assigned'}\nPhone: ${c.ambulanceDriverNumber || 'N/A'}`,
      `dispatched-${c.id}`
    );
  }

  /**
   * Notify that a mission has been completed.
   */
  static notifyCompleted(c: PatientCase) {
    this.show(
      '✅ MISSION COMPLETED',
      `Case ${c.id} for ${c.patientName} has been resolved.`,
      `completed-${c.id}`
    );
  }

  /**
   * Compare old and new case arrays and fire appropriate notifications.
   */
  static detectChangesAndNotify(
    oldCases: PatientCase[],
    newCases: PatientCase[],
    userRole: string,
    userName: string
  ) {
    if (!this.isEnabled()) return;

    const oldMap = new Map(oldCases.map(c => [c.id, c]));

    for (const nc of newCases) {
      const oc = oldMap.get(nc.id);

      // Brand new case (not in old list)
      if (!oc) {
        if (userRole === 'HOSPITAL' || userRole === 'POLICE') {
          if (nc.status === 'pending') {
            this.notifyNewCase(nc);
          }
        }
        continue;
      }

      // Status changed
      if (oc.status !== nc.status) {
        // Patient gets notified when their case is dispatched
        if (userRole === 'PATIENT' && nc.patientName === userName && nc.status === 'dispatched') {
          this.notifyDispatched(nc);
        }

        // Everyone gets notified when a case completes
        if (nc.status === 'completed') {
          this.notifyCompleted(nc);
        }
      }
    }
  }
}
