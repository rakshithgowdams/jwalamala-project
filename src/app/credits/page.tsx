import { getUiStrings } from "@/lib/i18n/server";
export async function generateMetadata() {
  const { kn } = await getUiStrings();
  return { title: kn.imageCredit };
}
export default async function Credits() {
  const { kn } = await getUiStrings();
  return (
    <div className="container page-shell text-page">
      <h1>{kn.imageCredit}</h1>
      <p>Logo: supplied by Jwalamala / MyDesignNexus.</p>
      <p>
        <a href="https://commons.wikimedia.org/wiki/File:Shravanabelagola_Hillview.jpg">
          Shravanabelagola Hillview
        </a>{" "}
        — Ananth H V,{" "}
        <a href="https://creativecommons.org/licenses/by-sa/3.0/">
          CC BY-SA 3.0
        </a>
        . Resized, cropped and converted to WebP; used for hill and landscape
        images.
      </p>
      <p>
        <a href="https://commons.wikimedia.org/wiki/File:Saavira_Kambada_Basadi,_1000_pillar_temple_Moodabidri,_Mudbidri_VRVTMRKOLLUR2015_(2).jpg">
          Saavira Kambada Basadi (2)
        </a>{" "}
        and{" "}
        <a href="https://commons.wikimedia.org/wiki/File:Saavira_Kambada_Basadi,_1000_pillar_temple_Moodabidri,_Mudbidri_VRVTMRKOLLUR2015_(23).jpg">
          Saavira Kambada Basadi (23)
        </a>{" "}
        — Vinayaraj,{" "}
        <a href="https://creativecommons.org/licenses/by-sa/4.0/">
          CC BY-SA 4.0
        </a>
        . Resized, cropped and converted to WebP. Adapted photos retain their
        respective licenses.
      </p>
      <p>{kn.sampleNote}</p>
    </div>
  );
}
