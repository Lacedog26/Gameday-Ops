// Device contacts picker for the WriteScreen recipient field.
//
// UX brief (from client feedback): when a user opens "who am I lifting"
// for the first time, the empty state feels disconnected from real people.
// Showing their actual phone contacts grounds the moment in someone they
// know. Unregistered contacts are fine — the existing free-form name
// flow already handles them via the share-card on DoneScreen.
//
// Permission model:
//   undetermined  → render a soft CTA in WriteScreen; tap → request
//   granted       → fetch + cache; list renders inline
//   denied        → silent (don't nag); free-form typing still works
//
// Cache: contacts are read once per app launch into module-scope. Reading
// the address book is expensive on Android, and we don't need real-time
// freshness for a compliment picker — a stale read is fine.

import { useEffect, useState, useCallback } from 'react';
import * as Contacts from 'expo-contacts';

export type SimpleContact = {
  id: string;
  name: string;
  initial: string;
  /** Primary email, if the contact has one. Used to match the recipient
   *  against an existing OneCompliment account at send time, and to claim
   *  the compliment when they later sign up / link this email. */
  email?: string;
  /** Primary phone, if the contact has one. Stored on the compliment for
   *  the pending-claim path (accounts have no phone on file yet, so it
   *  doesn't match at send time — see 20260610_contact_matching_and_pending). */
  phone?: string;
};

export type ContactsPermissionStatus =
  | 'loading'        // checking saved permission status
  | 'undetermined'   // never asked
  | 'granted'        // user said yes
  | 'denied';        // user said no — don't ask again, fall back to typing

export type UseContactsResult = {
  status: ContactsPermissionStatus;
  contacts: SimpleContact[];
  /** Prompt the OS permission sheet. Returns true if granted. */
  request: () => Promise<boolean>;
};

let cachedContacts: SimpleContact[] | null = null;

async function fetchAllContacts(): Promise<SimpleContact[]> {
  if (cachedContacts) return cachedContacts;
  const { data } = await Contacts.getContactsAsync({
    // Emails + PhoneNumbers let us match the recipient to an existing
    // account (by email) and store an identifier for the pending-claim flow.
    fields: [
      Contacts.Fields.Name,
      Contacts.Fields.FirstName,
      Contacts.Fields.LastName,
      Contacts.Fields.Emails,
      Contacts.Fields.PhoneNumbers,
    ],
    sort: Contacts.SortTypes.FirstName,
  });
  const seen = new Set<string>();
  const result: SimpleContact[] = [];
  for (const c of data) {
    const composed = `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim();
    const name = (c.name ?? composed).trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;       // dedupe: phone books often have dupes
    seen.add(key);
    // Prefer a contact-flagged primary; otherwise take the first entry.
    const email = (c.emails?.find(e => e.isPrimary) ?? c.emails?.[0])?.email?.trim() || undefined;
    const phone = (c.phoneNumbers?.find(p => p.isPrimary) ?? c.phoneNumbers?.[0])?.number?.trim() || undefined;
    result.push({
      id: c.id ?? key,
      name,
      initial: name.charAt(0).toUpperCase(),
      email,
      phone,
    });
  }
  cachedContacts = result;
  return result;
}

export function useContacts(): UseContactsResult {
  const [status, setStatus]     = useState<ContactsPermissionStatus>('loading');
  const [contacts, setContacts] = useState<SimpleContact[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { status: cur } = await Contacts.getPermissionsAsync();
        if (!mounted) return;
        if (cur === 'granted') {
          const list = await fetchAllContacts();
          if (!mounted) return;
          setContacts(list);
          setStatus('granted');
        } else if (cur === 'denied') {
          setStatus('denied');
        } else {
          setStatus('undetermined');
        }
      } catch {
        if (mounted) setStatus('denied');  // safer than blocking the screen
      }
    })();
    return () => { mounted = false; };
  }, []);

  const request = useCallback(async () => {
    try {
      const { status: cur } = await Contacts.requestPermissionsAsync();
      if (cur === 'granted') {
        const list = await fetchAllContacts();
        setContacts(list);
        setStatus('granted');
        return true;
      }
      setStatus('denied');
      return false;
    } catch {
      setStatus('denied');
      return false;
    }
  }, []);

  return { status, contacts, request };
}
