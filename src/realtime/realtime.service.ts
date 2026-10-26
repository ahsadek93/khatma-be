import { Injectable } from '@nestjs/common';
import type { MessageEvent } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';

export type KhatmaEvent = 'progressChanged' | 'membersChanged' | 'completed';

@Injectable()
export class RealtimeService {
  // shortcut: events stay in this process, add shared pub/sub when running multiple BE instances.
  private readonly streams = new Map<string, Subject<MessageEvent>>();

  subscribe(khatmaId: string) {
    let stream = this.streams.get(khatmaId);
    if (!stream) {
      stream = new Subject<MessageEvent>();
      this.streams.set(khatmaId, stream);
    }
    const current = stream;
    return new Observable<MessageEvent>((subscriber) => {
      const subscription = current.subscribe(subscriber);
      subscriber.next({ type: 'connected', data: 'connected' });
      return () => {
        subscription.unsubscribe();
        if (current.observed === false && this.streams.get(khatmaId) === current) this.streams.delete(khatmaId);
      };
    });
  }

  publish(khatmaId: string, event: KhatmaEvent) {
    this.streams.get(khatmaId)?.next({ type: event, data: event });
  }
}
