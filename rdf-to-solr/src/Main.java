
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

        // Path to the dbo.ttl.bz2
        String file = "C:/Users/Jan/Desktop/dbo.ttl.bz2";

        FileInputStream fis = null;

        try {
            fis = new FileInputStream(file);

        } catch (FileNotFoundException e1) {
            // TODO Auto-generated catch block
            e1.printStackTrace();
        }

        // Path to your solr instance
        String urlString = "http://localhost:8984/solr/factor_tool";
        SolrClient solr = new HttpSolrClient.Builder(urlString).build();


        int k = 0;

        try {

            scanner = new Scanner(new BZip2CompressorInputStream(fis));

            currentTriple = scanner.nextLine().split(" ");

            while (scanner.hasNext()) {

                collectData(currentTriple[0]);


                String name = currentTriple[0].substring(currentTriple[0].lastIndexOf('/') + 1);
                name = name.substring(0, name.length() -1);
                name = name.replace('_', ' ');
                name = name.replace("  ", " ");


                    SolrInputDocument doc = new SolrInputDocument();

                    doc.addField("name", name);
                    doc.addField("uri", currentTriple[0]);
                    doc.addField("weight", 1.0);

                    solr.add(doc);
                    k++;


                    // Report progress
                    if (k % 10000 == 0) {
                        solr.commit();
                        System.out.println("Processed " + k + " Entities.");
                    }

                    // Cancel manually for testing, this will take way too long for a full run
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
