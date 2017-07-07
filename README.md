# MMM-MyTTC

This a module for [MagicMirror](https://github.com/MichMich/MagicMirror/tree/develop).

It shows you how long you'll need to wait next for the next TTC (Toronto Transit) bus or streetcar on your route.
Sadly, TTC's public API doesn't provide subway schedules.  As such, this module doesn't provide subway times.

![Screenshot](/../screenshots/MMM-MyTTC_scr.png?raw=true "Screenshot")


## Installation
1. Navigate into your MagicMirror `modules` folder and execute<br>
`git clone https://github.com/jclarke0000/MMM-MyTTC.git`.
2. Enter the new `MMM-MyTTC` directory and execute `npm install`.

## Configuration

<table>
  <thead>
    <tr>
      <th>Option</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>routeList</code></td>
      <td><strong>REQUIRED</strong> An array of route numbers and stop number pairs.<br><br><strong>Type</strong> <code>Array</code><br />See below for more instructions on configuring your `routeList`.</td>
    </tr>
    <tr>
      <td><code>updateInterval</code></td>
      <td>How frequently in milliseconds to poll for data from TTC's public API.<br><br><strong>Type</strong> <code>Integer</code><br>Defaults to <code>60000</code> (i.e.: 1 minute)</td>
    </tr>
  </tbody>
</table>

## Configuring your routeList

Each entry in your `routeList` consists of a route number and stop number.

First determine which routes you're interested in (e.g.: `501` for the Queen St. streetcar). The full list of routes are listed here:
http://webservices.nextbus.com/service/publicXMLFeed?command=routeList&a=ttc

Next, got to `http://webservices.nextbus.com/service/publicXMLFeed?command=routeConfig&a=ttc&r=501`.  Replace the parameter `r=501` in the URL
with whatever route number you're interested in.  Determine which stop you want to see arrival times for. Usually this will be the one you
normally go to to wait for your bus or streetcar.  You'll need the number in the `tag` parameter, for example `2332`, as found in this line:

`<stop tag="2332" title="Queen St East At Yonge St (Queen Station)" lat="43.6525499" lon="-79.37909" stopId="3079"/>`

It's not explicitly listed whether the stop is for a particular direction on the route, but they are listed in order, and if you are familiar
with the route you should be able to figure out the right stop number.

At bare minimum you need one entry, with two properties:

* `routeNo` - the route number from the first step above
* `stop` - the stop number along the route.

You can test that you have the right combination by going to:
`http://webservices.nextbus.com/service/publicXMLFeed?&command=predictionsForMultiStops&a=ttc&stops=501|2332`.  Replace the `stops` parameter
at the end of the URL with the route number and stop number separater by the pipe `|` character.

Repeat for as many stops and routes as you would like.

Your config should something like this:

```
{
  module: 'MMM-MyTTC',
  position: 'top_left',
  header: 'TTC Schedule',
  config: {
    routeList: [
      {
        routeNo : '501',
        stop : '6108'
      },
      {
        routeNo : '501',
        stop : '2332'
      },
      {
        routeNo : '301',
        stop : '2332',
      },
      {
        routeNo : '143',
        stop: '1148'
      },
      {
        routeNo : '64',
        stop : '9055'
      }
    ]
  }
},

```

You'll notice above that I have two entries for the `501` route, but with different stops.  I've done this to monitor both eastbound and westbound
cars passing through the same intersection.  If you leave this as-is, both entries will have the same title, as they are for the same route, just
different directions. Therefore you can specify an additional parameter for a given entry to override the label.  

For example:

```
{
  module: 'MMM-MyTTC',
  position: 'top_left',
  header: 'TTC Schedule',
  config: {
    routeList: [
      {
        routeNo : '501',
        stop : '6108',
        label : 'Queen Westbound'
      },
      {
        routeNo : '501',
        stop : '2332',
        label : 'Queen Eastbound'
      },
      {
        routeNo : '301',
        stop : '2332',
      },
      {
        routeNo : '143',
        stop: '1148'
      },
      {
        routeNo : '64',
        stop : '9055'
      }
    ]
  }
},

```

Finally, it you would like to colour code your entries, you can specify an optional parameter 'color' property that will give the icon whatever
color you specify in hexadecimal format.  e.g.:

```
{
  routeNo : '501',
  stop : '6108',
  label : 'Queen Westbound',
  color : '#82BAE5' //colours the transit icon a light blue colour
},

```

Lastly, it should be noted that this module will hide a route entirely if there are no scheduled vehicles.  So if you're only seeing some of
your list entries, it's because that particular route isn't currently running, say because it's late at night or because the particular route
only operates during rush hour (e.g.: the downtown express routes).

