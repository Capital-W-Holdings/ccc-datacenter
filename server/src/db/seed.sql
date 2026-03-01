-- Seed Target Companies for CCC Data Center Summit

-- Hyperscalers / Cloud Providers
INSERT INTO target_companies (name, category, website, priority) VALUES
('Microsoft', 'Hyperscaler', 'https://azure.microsoft.com', 1),
('Amazon', 'Hyperscaler', 'https://aws.amazon.com', 1),
('Google', 'Hyperscaler', 'https://cloud.google.com', 1),
('Meta', 'Hyperscaler', 'https://about.meta.com', 1),
('Oracle', 'Hyperscaler', 'https://oracle.com/cloud', 2),
('Apple', 'Hyperscaler', 'https://apple.com', 2),
('CoreWeave', 'Hyperscaler', 'https://coreweave.com', 2),
('Lambda', 'Hyperscaler', 'https://lambdalabs.com', 3),
('Applied Digital', 'Hyperscaler', 'https://applieddigital.com', 3)
ON CONFLICT DO NOTHING;

-- Data Center Developers / Operators
INSERT INTO target_companies (name, category, website, priority) VALUES
('Equinix', 'Developer/Operator', 'https://equinix.com', 1),
('Digital Realty', 'Developer/Operator', 'https://digitalrealty.com', 1),
('QTS Realty', 'Developer/Operator', 'https://qtsdatacenters.com', 1),
('CyrusOne', 'Developer/Operator', 'https://cyrusone.com', 2),
('Vantage Data Centers', 'Developer/Operator', 'https://vantage-dc.com', 2),
('EdgeCore', 'Developer/Operator', 'https://edgecore.com', 2),
('Stack Infrastructure', 'Developer/Operator', 'https://stackinfra.com', 2),
('Compass Datacenters', 'Developer/Operator', 'https://compassdatacenters.com', 2),
('DataBank', 'Developer/Operator', 'https://databank.com', 3),
('TierPoint', 'Developer/Operator', 'https://tierpoint.com', 3),
('Flexential', 'Developer/Operator', 'https://flexential.com', 3),
('CloudHQ', 'Developer/Operator', 'https://cloudhq.com', 3),
('Prime Data Centers', 'Developer/Operator', 'https://primedatacenters.com', 3),
('Novva Data Centers', 'Developer/Operator', 'https://novvadc.com', 3),
('Aligned Data Centers', 'Developer/Operator', 'https://aligneddc.com', 3),
('Switch', 'Developer/Operator', 'https://switch.com', 3),
('Iron Mountain Data Centers', 'Developer/Operator', 'https://ironmountain.com/data-centers', 3),
('NTT Global Data Centers', 'Developer/Operator', 'https://services.global.ntt', 3),
('Sabey Data Centers', 'Developer/Operator', 'https://sabey.com', 4),
('H5 Data Centers', 'Developer/Operator', 'https://h5datacenters.com', 4),
('Lincoln Rackhouse', 'Developer/Operator', 'https://lincolnrackhouse.com', 4),
('T5 Data Centers', 'Developer/Operator', 'https://t5datacenters.com', 4),
('Chirisa Technology Parks', 'Developer/Operator', 'https://chirisatech.com', 4)
ON CONFLICT DO NOTHING;

-- Data Center Investors / Capital
INSERT INTO target_companies (name, category, website, priority) VALUES
('Blackstone', 'Investor', 'https://blackstone.com', 1),
('Brookfield', 'Investor', 'https://brookfield.com', 1),
('KKR', 'Investor', 'https://kkr.com', 2),
('DigitalBridge', 'Investor', 'https://digitalbridge.com', 2),
('Stonepeak', 'Investor', 'https://stonepeak.com', 2),
('IPI Partners', 'Investor', 'https://ipipartners.com', 3),
('Macquarie', 'Investor', 'https://macquarie.com', 3),
('GI Partners', 'Investor', 'https://gipartners.com', 3)
ON CONFLICT DO NOTHING;

-- Data Center Construction / Engineering
INSERT INTO target_companies (name, category, website, priority) VALUES
('Holder Construction', 'Construction', 'https://holderconstruction.com', 1),
('DPR Construction', 'Construction', 'https://dpr.com', 1),
('Hensel Phelps', 'Construction', 'https://henselphelps.com', 2),
('Turner Construction', 'Construction', 'https://turnerconstruction.com', 2),
('Mortenson', 'Construction', 'https://mortenson.com', 2),
('Whiting-Turner', 'Construction', 'https://whiting-turner.com', 2),
('JE Dunn', 'Construction', 'https://jedunn.com', 3),
('Corgan', 'Construction', 'https://corgan.com', 3),
('Gensler', 'Construction', 'https://gensler.com', 3),
('HDR', 'Construction', 'https://hdrinc.com', 3),
('Page', 'Construction', 'https://pagethink.com', 3),
('Jacobs', 'Construction', 'https://jacobs.com', 3),
('Burns & McDonnell', 'Construction', 'https://burnsmcd.com', 3),
('Black & Veatch', 'Construction', 'https://bv.com', 3),
('Rosendin Electric', 'Construction', 'https://rosendin.com', 3),
('Cupertino Electric', 'Construction', 'https://cei.com', 3),
('Faith Technologies', 'Construction', 'https://faithtechnologies.com', 4),
('Exyte', 'Construction', 'https://exyte.net', 4)
ON CONFLICT DO NOTHING;

-- Data Center Brokers / Advisors
INSERT INTO target_companies (name, category, website, priority) VALUES
('CBRE', 'Broker', 'https://cbre.com/data-center-solutions', 1),
('JLL', 'Broker', 'https://jll.com', 1),
('Cushman & Wakefield', 'Broker', 'https://cushmanwakefield.com', 2),
('Newmark', 'Broker', 'https://nmrk.com', 2),
('Colliers', 'Broker', 'https://colliers.com', 3),
('NADC', 'Broker', 'https://nadatacenters.com', 3),
('DatacenterHawk', 'Broker', 'https://datacenterhawk.com', 3)
ON CONFLICT DO NOTHING;

-- Seed Default Scrapers
INSERT INTO scrapers (name, type, description, config, is_active) VALUES
(
    'Data Center World Speakers',
    'conference',
    'Extract speakers from Data Center World conference',
    '{"urls": [], "selectors": {"name": ".speaker-name", "title": ".speaker-title", "company": ".speaker-company"}}',
    false
),
(
    'DCD Events Attendees',
    'conference',
    'Extract attendees from Datacenter Dynamics events',
    '{"urls": [], "selectors": {}}',
    false
),
(
    'AFCOM Conference',
    'conference',
    'Extract participants from AFCOM data center events',
    '{"urls": [], "selectors": {}}',
    false
),
(
    'Bisnow Data Center Events',
    'conference',
    'Extract speakers and sponsors from Bisnow data center events',
    '{"urls": [], "selectors": {}}',
    false
),
(
    'IMN Data Center Forum',
    'conference',
    'Extract participants from IMN data center forums',
    '{"urls": [], "selectors": {}}',
    false
),
(
    'AFCOM Member Directory',
    'directory',
    'Scrape AFCOM professional member listings',
    '{"urls": [], "selectors": {}}',
    false
),
(
    '7x24 Exchange Members',
    'directory',
    'Extract members from 7x24 Exchange',
    '{"urls": [], "selectors": {}}',
    false
),
(
    'Infrastructure Masons',
    'directory',
    'Scrape Infrastructure Masons directory',
    '{"urls": [], "selectors": {}}',
    false
),
(
    'Data Center Frontier News',
    'news',
    'Extract executives mentioned in Data Center Frontier articles',
    '{"urls": ["https://datacenterfrontier.com/"], "keywords": ["announces", "appoints", "joins", "executive"]}',
    false
),
(
    'Data Center Knowledge News',
    'news',
    'Extract executives from Data Center Knowledge articles',
    '{"urls": ["https://datacenterknowledge.com/"], "keywords": []}',
    false
),
(
    'Company Leadership Pages',
    'company',
    'Scrape leadership/team pages from target company websites',
    '{"urls": [], "selectors": {"name": ".team-name", "title": ".team-title"}}',
    false
),
(
    'GlobeSt Data Center Deals',
    'cre_deal',
    'Extract deal parties from GlobeSt data center transaction coverage',
    '{"urls": [], "keywords": ["data center", "hyperscale"]}',
    false
)
ON CONFLICT DO NOTHING;
