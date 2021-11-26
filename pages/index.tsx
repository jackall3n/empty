import GoogleCalendar from 'react-google-cal';
import { useEffect, useState } from "react";
import { orderBy, startCase } from "lodash";
import {
  addDays,
  addHours,
  addMinutes,
  endOfDay,
  endOfWeek,
  format,
  isSameDay,
  isWeekend,
  isWithinInterval,
  max,
  min,
  parse,
  startOfDay,
  startOfWeek,
  subHours
} from "date-fns";
import { utcToZonedTime } from 'date-fns-tz';
import Head from "next/head";

const calendar = GoogleCalendar.create({
  "clientId": "462660603403-khj5nlahao22ed684s838h5a2k734uhf.apps.googleusercontent.com",
  "apiKey": "AIzaSyBLsf9t5D6yVlzNi-fKb3SMZ-ZmC9EgBuw",
  "scope": "https://www.googleapis.com/auth/admin.directory.resource.calendar.readonly https://www.googleapis.com/auth/calendar",
  "discoveryDocs": [
    "https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest",
    "https://content.googleapis.com/discovery/v1/apis/admin/directory_v1/rest"
  ]
})

function getDate(date) {
  if (date.date) {
    return parse(date.date, 'yyyy-MM-dd', new Date())
  }

  return utcToZonedTime(date.dateTime, date.timeZone)
}

export function Desk({ desk, dates, user }) {
  const [bookings, setBookings] = useState([])

  async function getBookings() {
    const timeMin = startOfDay(min(dates)).toISOString();
    const timeMax = endOfDay(max(dates)).toISOString();

    console.log('watching')
    calendar.gapi.client.calendar.events.watch({
      calendarId: desk.id,
      token: "myToken123",
      requestBody: {
        id: "aasdf-123-fghj-qwer-5467a-333",
        type: "web_hook",
        address: window.location.href
      }
    }, (error, response) => {
      console.info('watch!', error, response)
    });

    const events = await calendar.gapi.client.calendar.events.list({
      calendarId: desk.id,
      orderBy: 'startTime',
      singleEvents: true,
      timeMax, // this is not the latest start time it's the latest end time
      timeMin,
      maxResults: 100
    })

    const items = events.result.items.filter(i => i.status !== 'cancelled');

    console.groupCollapsed(desk.name);

    const bookings = items.map(item => {
      const attendees = item.attendees?.filter(a => !a.resource).map(a => parseUser(a.email)) ?? [];

      if (!attendees.length) {
        attendees.push(parseUser(item.organizer.email))
      }

      try {
        console.groupCollapsed(item.summary);
        const startDate = getDate(item.start);
        const start = startOfDay(startDate);
        const endDate = getDate(item.end);
        const middleOfDay = subHours(endDate, 12);
        const end = endOfDay(isSameDay(start, endDate) ? endDate : middleOfDay);

        console.log('start', start)
        console.log('end', end)
        console.log('endDate', endDate)
        console.log('middleOfDay', middleOfDay)
        console.log('item', item);

        console.groupEnd();

        return {
          id: item.id,
          summary: item.summary,
          attendees: attendees ?? [],
          start: startDate,
          end: endDate,
          _: item
        };
      } catch (e) {
        console.error(desk, item, e.message);
        throw e;
      }
    });

    console.log({ bookings })

    console.groupEnd()

    // console.log(desk, { bookings });

    setBookings(bookings)
  }

  useEffect(() => {
    getBookings().then()
  }, [])

  async function book(date: Date) {
    const day = addHours(date, 12);

    await calendar.gapi.client.calendar.events.insert({
      calendarId: 'primary',
      resource: {
        summary: `${user.name} @ ${desk.name}`,
        attendees: [user, {
          email: desk.id
        }],
        start: {
          date: format(day, 'yyyy-MM-dd')
        },
        end: {
          date: format(addDays(day, 1), 'yyyy-MM-dd')
        }
      }
    })

    setTimeout(() => {
      getBookings().then();
    }, 1000);

  }

  return (
    <div
      className="grid grid-cols-6 divide-x divide-dashed divide-gray-200 group transition-colors hover:bg-gray-100 hover:divide-gray-300 "
      style={{ borderColor: desk.backgroundColor, color: desk.foregroundColor }}>
      <div className="px-2 py-2 sm:px-4 flex flex-col justify-center bg-gray-50 group-hover:bg-gray-200 transition-colors">
        <div className="font-medium text-xs sm:text-base">{desk.name}</div>
        {desk.type === 'ROOM' && (
          <div className="text-xs">Capacity: {desk.capacity}</div>
        )}
      </div>

      {dates.map(date => {
        console.log(date, desk.name, bookings);
        const _bookings = bookings.filter(b => isWithinInterval(date, {
          start: startOfDay(b.start),
          end: endOfDay(addMinutes(b.end, -1))
        }))

        if (!_bookings.length) {
          return (
            <div key={date.toISOString()} onClick={() => book(date)}
                 className="hover:bg-purple-100 transition-colors cursor-pointer" />
          )
        }

        return (
          <div key={date.toISOString()}
               className={`flex p-1.5 gap-1.5 flex-col flex ${desk.type === "DESK" && _bookings.length > 1 && ''}`}>
            {_bookings.map(booking => {
              const attendees = booking.attendees.length - 1;
              const [attendee] = booking.attendees;

              return (
                <div key={booking.id}
                     className={`px-2 flex-1 py-1.5 border border-t-4 ${booking.attendees.some(s => s.email === user.email) ? 'border-purple-300 bg-white text-purple-900' : 'border-blue-300 bg-white'}`}>
                  <div
                    className={`flex flex-col text-sm`}>
                    <div className="flex items-center justify-center sm:justify-between"
                         title={booking.attendees.map(a => a.name).join('\n')}>
                      <span
                        className="font-medium whitespace-nowrap overflow-ellipsis overflow-hidden sm:hidden text-center">{attendee.initials}</span>
                      <span
                        className="font-medium whitespace-nowrap overflow-ellipsis overflow-hidden hidden sm:block">{attendee.name}</span>
                      {attendees >= 1 &&
                      <span
                          className="ml-1.5 text-xs rounded-md bg-blue-200 font-medium px-1 border border-blue-300 cursor-pointer hidden sm:block">+{attendees}</span>}
                    </div>
                    <div
                      className="text-xs mt-0.5 text-black text-opacity-40 whitespace-nowrap overflow-ellipsis overflow-hidden hidden sm:block">{attendee.email}</div>
                    <div
                      className="text-xs mt-0.5 text-black text-opacity-40 whitespace-nowrap overflow-ellipsis overflow-hidden hidden sm:block">
                      <span>{format(booking.start, 'HH:mm')} - {format(booking.end, 'HH:mm')}</span>
                    </div>
                  </div>
                  {desk.type === 'ROOM' && (
                    <>
                      <div
                        className="text-xs hidden sm:block border-l-2 mt-1 pl-1 border-gray-300 text-gray-400 leading-tight text-black">
                        <div className="whitespace-nowrap overflow-ellipsis overflow-hidden" style={{ maxWidth: 150 }}>
                          {booking.summary}
                        </div>
                      </div>

                      <div className="flex-1" />
                    </>
                  )}
                </div>
              )
            })
            }
          </div>
        )

      })}
    </div>
  )
}

function getDates(from: Date, to: Date): Date[] {
  const dates = [];
  let current = from;

  while (isWithinInterval(current, { start: from, end: to })) {
    if (!isWeekend(current)) {
      dates.push(current);
    }

    current = addDays(current, 1);
  }

  return dates;
}

function parseUser(email: string) {
  const name = startCase(email.split('@')[0]);
  const initials = name.split(' ').map(v => v[0]).join('');

  return {
    initials,
    name,
    email
  }
}

export default function Home() {
  const [desks, setDesks] = useState([]);
  const dates = getDates(startOfWeek(new Date()), endOfWeek(new Date()));
  const [user, setUser] = useState<any>()

  async function login() {
    calendar.signIn();
  }

  async function init() {
    if (!calendar.gapi) {
      return;
    }

    console.clear();

    // const calendars = await calendar.gapi.client.calendar.calendarList.list();
    const calendars = await calendar.gapi.client.directory.resources.calendars.list({ customer: 'my_customer' });
    const primary = await calendar.gapi.client.calendar.calendarList.get({
      calendarId: 'primary'
    })


    setUser(parseUser(primary.result.id));

    console.log(primary);
    const items = calendars.result.items.filter(i => i.generatedResourceName.includes('Social'))

    const desks = items.map(desk => {
      console.log(desk.generatedResourceName)
      const [, , name] = /^(\(Desk\)-)?Brighton, UK - Social Distance-2-([^(]+) \((\d+)\)/gmi.exec(desk.generatedResourceName) ?? [];

      const type = name.includes('Desk') ? 'DESK' : 'ROOM';
      const [, deskNumber] = type === 'DESK' ? /Desk (\d+)/gmi.exec(name) : [];

      return {
        id: desk.resourceEmail,
        name,
        type,
        capacity: desk.capacity,
        deskNumber: Number(deskNumber) || undefined,
        backgroundColor: desk.backgroundColor,
        foregroundColor: desk.foregroundColor,
        _: desk
      }
    });

    setDesks(orderBy(desks.filter(s => s.type), ['type', 'deskNumber', 'name']));
  }

  console.log(desks);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    init().then()
  }, [])

  return (
    <div className="min-h-screen py-2 container mx-auto pb-32">
      <Head>
        <title>Create Next App</title>
        <link rel="icon" href="/favicon.ico" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Lato:wght@100;300;400;700&family=Open+Sans:wght@300;400;500;600;700&display=swap" />
      </Head>

      <div>
        <button onClick={login}>Login</button>
        <button onClick={init}>Load</button>
      </div>

      <img src="https://static.slab.com/prod/uploads/vm56qp7m/posts/images/tFyD3bZlcqrxDzgUjPG144f0.png"
           className="py-10" />

      <div className="grid grid-cols-1 border divide-y divide-dashed divide-gray-200 rounded-lg">
        <div className="grid grid-cols-6 sticky top-0 divide-x divide-dashed border-b bg-gray-50 rounded-t-lg">
          <div />
          {dates.map(date => (
            <div key={date.toISOString()} className="text-center py-2 pt-5">
              <div className="text-sm font-medium">{format(date, "EEE")}</div>
              <div className="text-xs">{format(date, "do MMM")}</div>
            </div>
          ))}
        </div>

        {desks.map(desk => (
          <Desk key={desk.id} dates={dates} desk={desk} user={user} />
        ))}
      </div>
    </div>
  )
}
