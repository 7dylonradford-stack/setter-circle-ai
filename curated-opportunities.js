import crypto from 'node:crypto';

// Manually reviewed public recruitment leads. Dates and pay come from the linked
// adverts, not an employer endorsement or a guarantee that a vacancy remains open.
export const reviewedOpportunities = [
 {company:'Be-Safe Technologies (via Ecruit)',title:'B2B Appointment Setter / SDR',location:'England, UK — Remote',pay:'£25–£35 per hour (advertised), plus performance bonuses',url:'https://www.jobs.service.gov.uk/jobs/6ad8c7d5813f93ba415987a7',posted:'2026-10-21T00:00:00Z',expires:'2026-11-20T23:59:59Z',note:'Outbound B2B software appointment setting during UK business hours. Proven cold-calling and appointment-setting experience required. Advert lists a 20 November 2026 closing date.'},
 {company:'Aurelo',title:'Appointment Setter',location:'Remote — UK agency; confirm location eligibility',pay:'Base + commission; amounts not published',url:'https://aurelo.uk/careers/appointment-setter',note:'Full-time outreach by email, LinkedIn and other channels to book discovery calls. Appointment-setting or SDR experience requested. Employer application form available. Posting date and closing date not published; confirm current availability.'},
 {company:'Working Order',title:'B2B Appointment Setter — Commission Only',location:'United Kingdom — Remote',pay:'Commission only — no guaranteed basic salary; terms not published',url:'https://uk.linkedin.com/jobs/view/b2b-appointment-setter-remote-uk-%E2%80%93-commission-only-4482135512',note:'Self-employed / independent contractor. Prospect UK service businesses and book qualified demonstrations for the closing team. Previous B2B experience preferred. Apply through LinkedIn; confirm commission and payment terms before accepting.'},
 {company:'Barclaycard Payments (via Pareto)',title:'Outbound B2B Appointment Setter',location:'Northampton, UK — Hybrid (3 office days / 2 WFH)',pay:'Up to £30,000 per annum plus bonus scheme (advertised)',url:'https://www.pareto.co.uk/jobs/653126-Outbound-Appointment-Setter',posted:'2026-10-14T00:00:00Z',note:'Telephone and email prospect qualification and appointment booking for payment services. Recruiter advert describes a route into corporate sales. Requires attendance in Northampton; not fully remote. Confirm vacancy availability with Pareto.'},
 {company:'BoostBookings',title:'Remote Appointment Setter — Warm Leads',location:'Remote — UK agency; confirm country eligibility',pay:'Base + commission stated; actual base and commission amounts not published',url:'https://careers.boostbookings.co.uk/job-description1',note:'AVAILABILITY TO CONFIRM: undated employer recruitment page. Follow up with requested enquiries and book clinic consultations. Sales, call-centre or appointment-setting experience requested. Flexible coverage Monday–Sunday. Confirm the vacancy is still open, UK eligibility, pay and contractual terms before applying.'}
];
export function reviewedId(url){const hex=crypto.createHash('sha256').update('reviewed-opportunity:'+url).digest('hex');return `${hex.slice(0,8)}-${hex.slice(8,12)}-4${hex.slice(13,16)}-a${hex.slice(17,20)}-${hex.slice(20,32)}`;}
export async function addReviewedOpportunities({pool,q}){
 if(!pool)return {added:0,skipped:true};
 let added=0;
 for(const job of reviewedOpportunities){
  // The review window is fixed: restarting the app must not renew stale leads.
  const expires=job.expires||'2026-11-01T23:59:59Z';
  const description=`Public recruitment lead reviewed 25 October 2026. ${job.note}\nSource: ${job.url}\nListed pay is the advertiser’s claim. This is not a vetted employer, confirmed placement or job guarantee. Check the original listing before applying.`;
  const result=await q(`INSERT INTO opportunities(id,title,company,description,type,location,apply_url,salary_text,category,source_name,source_url,workplace_type,posted_at,expires_at)
   SELECT $1,$2,$3,$4,'Appointment Setter',$5,$6,$7,'Appointment Setting',$8,$6,$9,$10,$11
   WHERE NOT EXISTS(SELECT 1 FROM opportunities WHERE apply_url=$6)
   ON CONFLICT(id) DO NOTHING RETURNING id`,[reviewedId(job.url),job.title,job.company,description,job.location,job.url,job.pay,'Manually reviewed public listing',job.location.includes('Hybrid')?'Hybrid':'Remote',job.posted||null,expires]);
  added+=result.rows.length;
 }
 console.log('Reviewed opportunity import',JSON.stringify({reviewed:reviewedOpportunities.length,added}));
 return {added};
}
