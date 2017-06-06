
import java.io.*;
import java.util.*;
import org.apache.solr.client.solrj.*;

import org.apache.commons.compress.compressors.bzip2.BZip2CompressorInputStream;
import org.apache.solr.client.solrj.impl.HttpSolrClient;
import org.apache.solr.common.SolrInputDocument;

/**
 * Created by Jan Forberg on 08.09.16.
 */
public class Main {

    private static ArrayList<String> currentTypes = new ArrayList<>();

    private static Hashtable<String, Hashtable<String, Float>> scores;

    private static Hashtable<String, Integer> classScores;

    private static Hashtable<String, Integer> relationScores;

    private static Scanner scanner;

    private static String[] currentTriple;

    public static void main(String[] args) throws IOException, SolrServerException {

        // Path to your solr instance
        String urlString = "http://localhost:8984/solr/factor_tool";
        SolrClient solr = new HttpSolrClient.Builder(urlString).build();

        FileInputStream fis = null;

        try {
            fis = new FileInputStream("/home/ciro/Desktop/factor-tool-master/rdf-to-solr/data/classes.txt");
        } catch (FileNotFoundException e1) {
            // TODO Auto-generated catch block
            e1.printStackTrace();
        }

        writeToSolr(solr, fis, "class");

        System.out.println("Done writing classes.");

        try {
            fis = new FileInputStream("/home/ciro/Desktop/factor-tool-master/rdf-to-solr/data/properties.txt");
        } catch (FileNotFoundException e1) {
            // TODO Auto-generated catch block
            e1.printStackTrace();
        }

        writeToSolr(solr, fis, "property");

        System.out.println("Done writing properties.");

        /*
        try {
            fis = new FileInputStream("/home/ciro/Desktop/factor-tool-master/rdf-to-solr/data/instance_types_en.ttl.bz2");
        } catch (FileNotFoundException e1) {
            // TODO Auto-generated catch block
            e1.printStackTrace();
        }

        try {
            scanner = new Scanner(new BZip2CompressorInputStream(fis));
            scanner.nextLine();
            int k = 0;

            while (scanner.hasNext()) {

                String line = scanner.nextLine();

                line = line.substring(0, line.indexOf(' '));
                line = line.replace("<", "");
                line = line.replace(">", "");

                String name = line.substring(line.lastIndexOf('/') + 1);
                name = name.replace('_', ' ');
                name = name.replace("  ", " ");

                SolrInputDocument doc = new SolrInputDocument();

                doc.addField("name", name);
                doc.addField("uri", "instance#" + line);

                solr.add(doc);

                if(k % 10000 == 0)
                {
                    System.out.println("Wrote " + k + " instances.");
                    solr.commit();
                }

                k++;

            }

            solr.commit();
            scanner.close();
            fis.close();
        } catch (Exception e) {
            // TODO Auto-generated catch block
            e.printStackTrace();
        }

        System.out.println("Done writing instances.");
        */
    }

    private static void writeToSolr(SolrClient solr, FileInputStream fis, String prefix) {
        try {
            scanner = new Scanner(fis);

            while (scanner.hasNext()) {
                String line = scanner.nextLine();

                String name = line.substring(line.lastIndexOf('/') + 1);
                name = name.replace('_', ' ');
                name = name.replace("  ", " ");

                SolrInputDocument doc = new SolrInputDocument();

                doc.addField("name", name);
                doc.addField("uri", prefix + "#" + line);

                solr.add(doc);
            }

            solr.commit();

            scanner.close();
            fis.close();
        } catch (Exception e) {
            // TODO Auto-generated catch block
            e.printStackTrace();
        }
    }

    private static void collectData(String subject) {
        currentTypes.clear();

        while(scanner.hasNext()) {
            String line = scanner.nextLine();

            currentTriple = line.split(" ");

            if(!currentTriple[0].equals(subject)) {
                return;
            }
        }
    }


}
