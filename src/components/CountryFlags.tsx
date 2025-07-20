// import { useEffect, useState } from "react";

interface CountryData {
  name: string;
  code: string;
}

export async function fetchCountryFromGeo(geoString: string): Promise<CountryData | null> {
  // Regex to extract latitude and longitude from geoString
  const match = geoString.match(/([-.\d]+),([-.\d]+)/);
  if (!match) {
    console.error("Invalid geoString format:", geoString);
    return null;
  }
  const lat = parseFloat(match[1]);
  const lng = parseFloat(match[2]);

  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;

  try {
    const response = await fetch(url, { headers: { "User-Agent": "MyApp" } });
    if (!response.ok) throw new Error(`Nominatim error: ${response.status}`);

    const data = await response.json();
    return {
      name: data.address?.country || "Unknown",
      code: data.address?.country_code?.toUpperCase() || "",
    };
  } catch (error) {
    console.error("Error fetching country:", error);
    return null;
  }
}
/* 
export const CountryFlag: React.FC<{ geoString?: string }> = ({ geoString }) => {
  const [country, setCountry] = useState<CountryData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!geoString || !geoString.startsWith("geo:")) {
      setCountry(null);
      return;
    }

    setLoading(true);
    fetchCountryFromGeo(geoString)
      .then((data) => setCountry(data))
      .finally(() => setLoading(false));
  }, [geoString]);
  // If no geoString is provided or country data is missing, return null
  if (!geoString || !country) return null;

  return (
    <div className="flex flex-col items-center">
      {country.code ? (
        <img
          src={`/country_flags/${country.code.toLowerCase()}.svg`}
          alt={`${country.name} Flag`}
          className="w-20 h-14 border border-gray-300 shadow-md"
          onError={(e) => (e.currentTarget.style.display = "none")} // Hide broken images
        />
      ) : null}
      <h2 className="text-lg text-deepPink font-bold">{country.name}</h2>

    </div>
  );
}; */

