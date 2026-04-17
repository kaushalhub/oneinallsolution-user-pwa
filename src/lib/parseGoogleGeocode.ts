export type ParsedMapAddress = {
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
};

function pickFirst(comps: google.maps.GeocoderAddressComponent[], ...types: string[]): string {
  for (const t of types) {
    const c = comps.find((x) => x.types.includes(t));
    if (c?.long_name) return c.long_name;
  }
  return '';
}

/** Best-effort parse for India and other regions from a Geocoder result. */
export function parseGeocodeResult(result: google.maps.GeocoderResult): ParsedMapAddress {
  const comps = result.address_components;

  const streetNumber = pickFirst(comps, 'street_number');
  const route = pickFirst(comps, 'route');
  let line1 = [streetNumber, route].filter(Boolean).join(' ').trim();
  if (!line1) {
    line1 =
      pickFirst(comps, 'premise', 'point_of_interest', 'establishment') ||
      result.formatted_address.split(',')[0]?.trim() ||
      '';
  }

  const line2Parts = [
    pickFirst(comps, 'neighborhood'),
    pickFirst(comps, 'sublocality_level_2'),
    pickFirst(comps, 'sublocality_level_1'),
    pickFirst(comps, 'sublocality'),
  ].filter(Boolean);
  const line2 = [...new Set(line2Parts)].join(', ');

  const city =
    pickFirst(comps, 'locality') ||
    pickFirst(comps, 'administrative_area_level_3') ||
    pickFirst(comps, 'administrative_area_level_2') ||
    '';

  const state = pickFirst(comps, 'administrative_area_level_1');
  const rawPin = pickFirst(comps, 'postal_code');
  const pincode = rawPin.replace(/\D/g, '').slice(0, 10);

  return {
    line1: line1.slice(0, 220).trim(),
    line2: line2.slice(0, 220).trim(),
    city: city.slice(0, 120).trim(),
    state: state.slice(0, 120).trim(),
    pincode,
  };
}
