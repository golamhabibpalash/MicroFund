import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { ConfirmationDialogComponent } from './confirmation-dialog.component';
import { ConfirmationOptions } from './confirmation.model';

@Injectable({ providedIn: 'root' })
export class ConfirmationService {
  constructor(private dialog: MatDialog) {}

  /**
   * Enforces the two-step rule for critical actions:
   * 1st step opens the confirmation dialog (no action taken).
   * 2nd step ("Confirm") executes; "Cancel"/dismiss aborts returning false.
   */
  confirm(options: ConfirmationOptions): Observable<boolean> {
    const ref = this.dialog.open(ConfirmationDialogComponent, {
      width: '440px',
      disableClose: false,
      autoFocus: false,
      data: options,
      panelClass: 'confirmation-dialog-panel',
    });
    return ref.afterClosed();
  }
}
